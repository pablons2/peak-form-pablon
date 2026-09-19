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
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.WEB_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
