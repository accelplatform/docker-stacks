FROM mcr.microsoft.com/mssql/server:2025-latest

COPY --chmod=755 ./init/ /opt/mssql/init/
COPY --chmod=755 ./entrypoint.sh /entrypoint.sh

HEALTHCHECK --interval=5s --timeout=5s --start-period=180s --retries=20 \
    CMD test -f /var/opt/mssql/.initialization_complete || exit 1

ENTRYPOINT ["bash", "/entrypoint.sh"]