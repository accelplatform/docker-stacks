FROM mcr.microsoft.com/mssql/server:2025-latest

# スクリプトをコピー
COPY --chmod=755 ./init/01_create_app_user.sql /opt/mssql/init/01_create_app_user.sql
COPY --chmod=755 ./entrypoint.sh /entrypoint.sh

# HEALTHCHECK を追加
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=10 \
    CMD test -f /var/opt/mssql/.initialization_complete || exit 1

ENTRYPOINT ["bash", "/entrypoint.sh"]