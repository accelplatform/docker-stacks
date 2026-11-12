FROM amazoncorretto:11-alpine

# Noto Sans CJK JP 2.004 (SIL OFL 1.1)。内容が変わらないよう上流のコミットで固定し、SHA-256 で検証する。
ARG NOTO_CJK_COMMIT=165c01b46ea533872e002e0785ff17e44f6d97d8

WORKDIR /opt

COPY . .

RUN apk update && \
    apk add --no-cache alpine-sdk linux-headers curl fontconfig && \
    mkdir -p /usr/share/fonts/noto && \
    curl -fsSL -o /usr/share/fonts/noto/NotoSansCJKjp-Regular.otf "https://github.com/notofonts/noto-cjk/raw/${NOTO_CJK_COMMIT}/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf" && \
    curl -fsSL -o /usr/share/fonts/noto/NotoSansCJKjp-Bold.otf "https://github.com/notofonts/noto-cjk/raw/${NOTO_CJK_COMMIT}/Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf" && \
    echo "68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5  /usr/share/fonts/noto/NotoSansCJKjp-Regular.otf" | sha256sum -c - && \
    echo "e53dcb0dcb2922e45d01aae1ebd2f382bb81d4229b18b6b883bd170678af1f76  /usr/share/fonts/noto/NotoSansCJKjp-Bold.otf" | sha256sum -c - && \
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
