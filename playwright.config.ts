import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT ?? '3005';
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // Generous: these run against `next dev`, where the first request to a route
  // compiles it on demand. A cold route can take tens of seconds, which is a
  // property of the dev server, not of the app.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 1,
  // These run against `next dev`, which compiles each route on first request.
  // Saturating it with workers makes every worker slow at once and produces
  // timeouts that look like product bugs but are contention. Two is stable here.
  workers: 2,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
