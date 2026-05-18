FROM amazoncorretto:11.0.28-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /opt

COPY . .

RUN tar xvzf $(ls apache-cassandra-*-bin.tar.gz) && \
    mv $(ls -d apache-cassandra-*/) apache-cassandra && \
    rm $(ls apache-cassandra-*-bin.tar.gz)

RUN cp -r overwrite/* apache-cassandra/ && \
    rm -rf overwrite

WORKDIR /opt/apache-cassandra

ENTRYPOINT [ "bin/cassandra", "-f" ]
