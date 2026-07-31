FROM amazoncorretto:8-alpine-jdk

WORKDIR /app
COPY . .

RUN chmod +x /app/extract.sh

ENTRYPOINT ["/app/extract.sh" ]