FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY build.mjs ./
COPY overwrite ./overwrite

ENTRYPOINT ["node", "/app/build.mjs"]
