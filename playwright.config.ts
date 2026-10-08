import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: 1,
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "node scripts/verify.mjs serve",
    url: "http://localhost:3100/dang-nhap",
    timeout: 180000,
    reuseExistingServer: false,
  },
});
