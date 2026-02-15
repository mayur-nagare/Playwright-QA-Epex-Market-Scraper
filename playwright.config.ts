import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  reporter: 'list',
});
