const { createRequire } = require('node:module');
const { dirname, join } = require('node:path');
const { execFileSync } = require('node:child_process');

// npm may hoist either Playwright version; resolve from each consumer.
const installed = new Set();
for (const consumer of ['@playwright/test', '@playwright/mcp']) {
  const fromConsumer = createRequire(join(process.cwd(), 'node_modules', consumer, 'package.json'));
  const cli = join(dirname(fromConsumer.resolve('playwright/package.json')), 'cli.js');
  if (!installed.has(cli)) {
    execFileSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit' });
    installed.add(cli);
  }
}
