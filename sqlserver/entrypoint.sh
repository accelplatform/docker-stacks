#!/bin/bash

# sqlcmdの正しいパスを探す
SQLCMD=""
for cmd in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd sqlcmd; do
    if [ -f "$cmd" ] || command -v "$cmd" > /dev/null 2>&1; then
        SQLCMD="$cmd"
        break
    fi
done

if [ -z "$SQLCMD" ]; then
    echo "ERROR: sqlcmd not found in expected locations!"
    exit 1
fi

# 環境変数を展開
if [ -d /opt/mssql/init ]; then
    for f in /opt/mssql/init/*.sql; do
        if [ -f "$f" ]; then
            # sedを使用して環境変数を置換
            sed -e "s|\$(APP_USER)|${APP_USER}|g" \
                -e "s|\$(APP_USER_PASSWORD)|${APP_USER_PASSWORD}|g" \
                "$f" > "${f}.tmp"
            mv "${f}.tmp" "$f"
        fi
    done
fi

# SQL Serverをバックグラウンドで起動
/opt/mssql/bin/sqlservr &
SERVER_PID=$!

# SQL Serverの起動を確認（接続可能になるまで待機）
for i in {1..30}; do
    if "$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# 初期化スクリプトを実行
if [ -d /opt/mssql/init ]; then
    for f in /opt/mssql/init/*.sql; do
        if [ -f "$f" ]; then
            "$SQLCMD" -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -i "$f" > /dev/null 2>&1
        fi
    done
fi

# 初期化完了マーカーを作成
touch /var/opt/mssql/.initialization_complete

# SQL Serverプロセスを待機
wait $SERVER_PID
