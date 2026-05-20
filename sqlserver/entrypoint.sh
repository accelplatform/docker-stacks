#!/bin/bash
set -euo pipefail

log() { echo "[entrypoint] $*"; }

# sqlcmdの正しいパスを探す
SQLCMD=""
for cmd in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd sqlcmd; do
    if [ -x "$cmd" ] || command -v "$cmd" > /dev/null 2>&1; then
        SQLCMD="$cmd"
        break
    fi
done
if [ -z "$SQLCMD" ]; then
    log "ERROR: sqlcmd not found!" >&2
    exit 1
fi

# 初期化済みならスクリプトは流さず、SQL Serverをそのままフォアグラウンドで起動
if [ -f /var/opt/mssql/.initialization_complete ]; then
    log "Already initialized. Starting SQL Server in foreground."
    exec /opt/mssql/bin/sqlservr
fi

# APP_USER変数の空チェックをbash側で実施
DO_USER_SETUP=0
if [ -n "${APP_USER:-}" ] && [ -n "${APP_USER_PASSWORD:-}" ]; then
    DO_USER_SETUP=1
    : "${APP_DB:=iap_db}"
    : "${APP_DB_COLLATION:=Japanese_XJIS_100_CS_AS_KS_WS}"
    log "Will create login [${APP_USER}] and database [${APP_DB}] (collation: ${APP_DB_COLLATION})"
else
    log "APP_USER / APP_USER_PASSWORD not set, will skip user/db creation."
fi

log "First boot. Starting SQL Server in background for initialization."
/opt/mssql/bin/sqlservr &
SERVER_PID=$!

# ステップA: TCP接続が通るまで待つ
log "Waiting for SQL Server to accept connections..."
CONNECTED=0
for i in $(seq 1 90); do
    if "$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
        -Q "SELECT 1" -b -l 5 > /dev/null 2>&1; then
        log "  connection established (attempt $i)"
        CONNECTED=1
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        log "ERROR: sqlservr process died during startup!" >&2
        exit 1
    fi
    sleep 2
done
if [ "$CONNECTED" -ne 1 ]; then
    log "ERROR: Could not connect to SQL Server within timeout." >&2
    kill "$SERVER_PID" 2>/dev/null || true
    exit 1
fi

# ステップB: master DBが READ_WRITE で完全に安定するまで待つ
log "Waiting for master DB to be fully ready..."
for i in $(seq 1 90); do
    if "$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d master \
        -Q "SET NOCOUNT ON;
            IF DATABASEPROPERTYEX('master','Status') <> N'ONLINE' RAISERROR('not online',16,1);
            IF DATABASEPROPERTYEX('master','Updateability') <> N'READ_WRITE' RAISERROR('not rw',16,1);" \
        -b -l 5 > /dev/null 2>&1; then
        log "  master DB is fully ready (attempt $i)"
        break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        log "ERROR: sqlservr process died while waiting for master." >&2
        exit 1
    fi
    sleep 2
done

# 念のため数秒安定マージン
log "Waiting extra 5s for stabilization..."
sleep 5

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    log "ERROR: sqlservr process died after settle wait." >&2
    exit 1
fi

# 現在の照合順序を確認 (master は変更しないが念のため記録)
ACTUAL_COLLATION=$("$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -h-1 \
    -Q "SET NOCOUNT ON; SELECT CAST(SERVERPROPERTY('Collation') AS sysname);" -b 2>/dev/null | tr -d '\r\n ')
log "Current server (master) collation: $ACTUAL_COLLATION"

# ステップC: 初期化スクリプトを順番に実行
if [ "$DO_USER_SETUP" -eq 1 ] && [ -d /opt/mssql/init ]; then
    # ファイル名でソート: 02_create_app_db.sql → 01_create_app_user.sql → 03_grant_app_user.sql の順に並ばないので
    # → 名前順実行のため命名規則を 01_db, 02_login, 03_grant にしている前提
    # 実際には for f in /opt/mssql/init/*.sql で名前順展開される
    for f in $(ls /opt/mssql/init/*.sql 2>/dev/null | sort); do
        [ -f "$f" ] || continue
        log "Running init script: $f"
        if ! "$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
            -v APP_USER="${APP_USER}" APP_USER_PASSWORD="${APP_USER_PASSWORD}" \
                APP_DB="${APP_DB}" APP_DB_COLLATION="${APP_DB_COLLATION}" \
            -b -i "$f"; then
            log "ERROR: init script $f failed!" >&2
            kill "$SERVER_PID" 2>/dev/null || true
            wait "$SERVER_PID" 2>/dev/null || true
            exit 1
        fi
    done

    # 検証1: アプリ用DBが存在し正しい照合順序になっているか
    log "Verifying database [${APP_DB}] exists with correct collation..."
    DB_COLLATION=$("$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -h-1 \
        -Q "SET NOCOUNT ON; SELECT CAST(DATABASEPROPERTYEX(N'${APP_DB}','Collation') AS sysname);" -b 2>/dev/null | tr -d '\r\n ')
    if [ "$DB_COLLATION" != "$APP_DB_COLLATION" ]; then
        log "ERROR: Database [${APP_DB}] collation mismatch! Expected: ${APP_DB_COLLATION}, Got: ${DB_COLLATION}" >&2
        kill "$SERVER_PID" 2>/dev/null || true
        exit 1
    fi
    log "  OK: database collation is ${DB_COLLATION}"

    # 検証2: ログインが存在するか
    log "Verifying login [${APP_USER}] exists..."
    if ! "$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
        -Q "SET NOCOUNT ON;
            IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'${APP_USER}')
                RAISERROR('login missing',16,1);" -b > /dev/null; then
        log "ERROR: Login [${APP_USER}] was NOT created!" >&2
        kill "$SERVER_PID" 2>/dev/null || true
        exit 1
    fi

    # 検証3: APP_USER で実際にアプリ用DBに接続できるか
    log "Verifying APP_USER can log in to ${APP_DB}..."
    if ! "$SQLCMD" -C -S localhost -U "${APP_USER}" -P "${APP_USER_PASSWORD}" -d "${APP_DB}" \
        -Q "SELECT DB_NAME();" -b > /dev/null; then
        log "ERROR: Login [${APP_USER}] cannot connect to ${APP_DB}!" >&2
        kill "$SERVER_PID" 2>/dev/null || true
        exit 1
    fi
    log "  OK: login verified against ${APP_DB}."
fi

touch /var/opt/mssql/.initialization_complete
log "Initialization complete."

trap 'kill -TERM "$SERVER_PID" 2>/dev/null || true' TERM INT
wait "$SERVER_PID"
