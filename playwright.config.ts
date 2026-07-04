import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const startsOwnServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["dot"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "mobile-chromium",
      use: devices["Pixel 5"],
    },
  ],
  webServer: startsOwnServer
    ? {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
