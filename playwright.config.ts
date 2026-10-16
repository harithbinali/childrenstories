import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests that need no secrets: public pages, route protection,
 * language switching and the reader (via the design-system preview routes).
 *
 *   pnpm build && pnpm test:e2e                 # starts `next start` on :3200
 *   BASE_URL=http://localhost:3000 pnpm test:e2e # against a running dev server
 */
const external = process.env.BASE_URL;
const baseURL = external ?? "http://localhost:3200";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false } },
  ],
  webServer: external ? undefined : {
    command: "npx next start -p 3200",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // Preview routes are staff-only in production; open them for the test server.
    env: { DESIGN_SYSTEM_PUBLIC: "true" },
    timeout: 120_000,
  },
});
