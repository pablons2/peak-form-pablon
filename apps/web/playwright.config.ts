import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// PRD 15 §6.1 — one feature directory per module PRD slug, generated into
// .features-gen (gitignored via **/test-results ignore pattern is not
// enough; playwright-bdd's own default output dir is used here).
const testDir = defineBddConfig({
  features: "test/features/**/*.feature",
  steps: "test/features/**/*.steps.ts",
});

export default defineConfig({
  testDir,
  // Serialized: every scenario shares the same dev DB, the same MailHog, and
  // the same `next dev` server (which compiles routes/middleware on demand).
  // Parallel workers made logins flaky — a click can beat hydration on a
  // cold-compiled /login, and the shared stack is the same reason the API
  // BDD suite runs maxWorkers: 1.
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.WEB_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
