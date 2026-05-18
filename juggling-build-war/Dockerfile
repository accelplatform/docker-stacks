FROM amazoncorretto:8-alpine-jdk

RUN apk update && apk add apache-ant && \
    rm -rf /var/cache/apk/*

WORKDIR /app
COPY . .

ENTRYPOINT ["ant"]