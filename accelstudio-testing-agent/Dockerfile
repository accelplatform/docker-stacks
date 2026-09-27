ARG PLAYWRIGHT_VERSION
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

ARG PLAYWRIGHT_VERSION
ARG PLAYWRIGHT_MCP_VERSION
ARG LANG
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN wget -O - https://apt.corretto.aws/corretto.key | gpg --dearmor -o /usr/share/keyrings/corretto-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/corretto-keyring.gpg] https://apt.corretto.aws stable main" > /etc/apt/sources.list.d/corretto.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends java-17-amazon-corretto-jdk locales fonts-ipafont unzip \
  && locale-gen ${LANG} \
  && update-locale LANG=${LANG} \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/playwright
COPY install-browsers.cjs ./
RUN npm install --save-exact --omit=dev @playwright/test@${PLAYWRIGHT_VERSION} @playwright/mcp@${PLAYWRIGHT_MCP_VERSION} \
  && node install-browsers.cjs \
  && npm cache clean --force

WORKDIR /usr/src/app
COPY . .
RUN unzip -q accel_studio_testing_agent-*.zip && rm accel_studio_testing_agent-*.zip

EXPOSE 8188
ENTRYPOINT ["sh", "/usr/src/app/start-agent.sh"]
