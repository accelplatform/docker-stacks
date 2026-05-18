ARG PLAYWRIGHT_VERSION
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble

ARG PLAYWRIGHT_VERSION
ARG LANG
ENV NODE_ENV=production \
    PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION}

RUN wget -O - https://apt.corretto.aws/corretto.key | gpg --dearmor -o /usr/share/keyrings/corretto-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/corretto-keyring.gpg] https://apt.corretto.aws stable main" | tee /etc/apt/sources.list.d/corretto.list \
  && apt update \
  && apt upgrade -y \
  && apt install -y java-17-amazon-corretto-jdk locales fonts-ipafont unzip \
  && locale-gen ${LANG} \
  && update-locale LANG=${LANG}

WORKDIR /opt/playwright
RUN npm pack @playwright/test@${PLAYWRIGHT_VERSION} @playwright/mcp@0.0.36
RUN npx cross-env PLAYWRIGHT_BROWSERS_PATH=/opt/playwright npx playwright@${PLAYWRIGHT_VERSION} install --with-deps chromium

WORKDIR /usr/src/app

COPY . .

RUN unzip -q $(ls accel_studio_testing_agent-*.zip) && \
    rm $(ls accel_studio_testing_agent-*.zip)

EXPOSE 8188

ENTRYPOINT ["sh", "-c", "exec java -Dimbq.ast.agent.oauth-api-key=${ACCELPLATFORM_ACCESS_TOKEN} \
  -Dimbq.ast.agent.testing-target-base-url=${ACCELPLATFORM_BASE_URL} \
  -Dimbq.ast.agent.script-playwright-package-path=/opt/playwright/playwright-test-${PLAYWRIGHT_VERSION}.tgz \
  -Dimbq.ast.agent.script-playwright-mcp-package-path=/opt/playwright/playwright-mcp-0.0.36.tgz \
  -Dimbq.ast.agent.playwright-browsers-path=/opt/playwright \
  -Dimbq.ast.agent.script-playwright-mcp-config-path=/usr/src/app/mcp-config.json \
  -Dlogging.file.name=logs/accel_studio_testing_agent.log \
  -jar $(ls /usr/src/app/accel_studio_testing_agent-*.jar | head -1)"]
