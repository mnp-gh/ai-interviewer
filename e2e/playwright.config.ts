// The end-to-end smoke test: the built client in a real browser, against the real server with scripted
// AI and speech and an in-memory MongoDB (server/e2e/server.ts). Build the client first (`pnpm e2e` does).
import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const API_PORT = 8090;
const WEB_PORT = 4180;

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  forbidOnly: CI,
  workers: 1,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // PW_CHANNEL=chrome uses an installed Chrome when the bundled Chromium can't be downloaded.
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL || undefined },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter server e2e:serve",
      env: { PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: !CI,
      // The first run downloads a MongoDB binary.
      timeout: 180_000,
      stdout: "pipe",
    },
    {
      // Vite preview proxies /api like the dev server does.
      command: `pnpm --filter client exec vite preview --port ${WEB_PORT} --strictPort`,
      env: { API_PORT: String(API_PORT) },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !CI,
    },
  ],
});
