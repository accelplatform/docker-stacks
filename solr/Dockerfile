FROM amazoncorretto:11.0.28-alpine

RUN apk update && apk add unzip procps bash && \
  rm -rf /var/cache/apk/*

WORKDIR /opt

COPY . .

RUN unzip -d /opt solr.zip && \
    rm solr.zip

WORKDIR /opt/solr
RUN chmod +x bin/solr

ENTRYPOINT [ "bin/solr", "-force", "-f" ]