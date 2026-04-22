import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3334'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  globalSetup: './tests/e2e/global_setup.ts',

  webServer: {
    command: 'node ace serve --hmr',
    url: `${BASE_URL}/@vite/client`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'test',
      PORT: '3334',
      HOST: '0.0.0.0',
      DB_DATABASE: 'sporty_e2e',
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: process.env.DB_PORT ?? '5432',
      DB_USER: process.env.DB_USER ?? 'sporty',
      DB_PASSWORD: process.env.DB_PASSWORD ?? 'sporty',
      APP_KEY: process.env.APP_KEY ?? 'kDvkrhtbc8N2L0ftV-wQbX4Msfce8-IrF4AsJwtJ4do',
      LOG_LEVEL: 'error',
      SESSION_DRIVER: 'cookie',
      TZ: 'UTC',
    },
  },
})
