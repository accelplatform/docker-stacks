FROM container-registry.oracle.com/database/free:23.26.1.0

USER root

COPY ./init/00_create_app_user.sh /opt/oracle/scripts/startup/00_create_app_user.sh
RUN chmod +x /opt/oracle/scripts/startup/00_create_app_user.sh && \
    chown oracle:oinstall /opt/oracle/scripts/startup/00_create_app_user.sh

USER oracle