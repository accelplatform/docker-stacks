FROM amazoncorretto:11.0.28-alpine

WORKDIR /opt

COPY . .

RUN apk update && \
    apk add --no-cache alpine-sdk linux-headers curl fontconfig && \
    mkdir -p /usr/share/fonts/noto && \
    curl --insecure -L -o /usr/share/fonts/noto/NotoSansCJKjp-Regular.otf "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf" && \
    curl --insecure -L -o /usr/share/fonts/noto/NotoSansCJKjp-Bold.otf "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf" && \
    fc-cache -fv && \
    rm -rf /var/cache/apk/*

RUN tar xvzf $(ls resin-pro-*.tar.gz) && \
    mv $(ls -d resin-pro-*/) resin && \
    rm $(ls resin-pro-*.tar.gz)

WORKDIR /opt/resin

RUN ./configure --prefix=`pwd` --disable-jni --disable-ssl --enable-64bit --disable-mod_caucho_shm && \
    make && \
    make install

WORKDIR /opt

RUN cp -r overwrite/* resin/ && \
    rm -rf overwrite

WORKDIR /opt/resin

EXPOSE 8080 9000

ENTRYPOINT [ "bin/resinctl", "console" ]
