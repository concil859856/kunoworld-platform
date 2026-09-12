import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the real gateway and a mock-TEE worker
 * (see tests/e2e/README.md). Two dev servers are started: one with no region
 * override, one pretending to be in Japan, because NEXT_PUBLIC_* values are
 * baked in when the server compiles.
 */
const API = process.env.NEXT_PUBLIC_KUNO_API ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "unknown-region",
      testIgnore: ["**/h3-region.spec.ts"],
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "japan",
      testMatch: ["**/h3-region.spec.ts"],
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "ignore",
      env: { NEXT_PUBLIC_KUNO_API: API, KUNO_DIST_DIR: ".next" },
    },
    {
      command: "npm run dev -- --port 3001",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "ignore",
      env: { NEXT_PUBLIC_KUNO_API: API, NEXT_PUBLIC_KUNO_DEV_COUNTRY: "JP", KUNO_DIST_DIR: ".next-jp" },
    },
  ],
});
