#!/bin/sh
set -eu
set -- /usr/src/app/accel_studio_testing_agent-*.jar
[ "$#" -eq 1 ] && [ -f "$1" ] || { echo "Expected exactly one testing agent JAR" >&2; exit 1; }
exec java -Dfile.encoding=UTF-8 \
  "-Dimbq.ast.agent.oauth-api-key=${ACCELPLATFORM_ACCESS_TOKEN}" \
  "-Dimbq.ast.agent.testing-target-base-url=${ACCELPLATFORM_BASE_URL}" \
  -Dimbq.ast.agent.prebuilt-node-modules-path=/opt/playwright/node_modules \
  -Dimbq.ast.agent.playwright-browsers-path=/ms-playwright \
  -Dimbq.ast.agent.script-playwright-mcp-config-path=/usr/src/app/mcp-config.json \
  -Dlogging.file.name=logs/accel_studio_testing_agent.log \
  -jar "$1"
