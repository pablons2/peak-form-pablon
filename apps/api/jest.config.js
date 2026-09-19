/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  // PRD 02 grew the Prisma schema enough (6 more models/enums) that
  // ts-jest's default per-file type-checked transform (full LanguageService
  // diagnostics against @prisma/client's generated types) became
  // pathologically slow — a single trivial spec took minutes instead of
  // seconds. isolatedModules skips type-checking during the test transform
  // (transpile only); type safety is still enforced by `tsc --noEmit`
  // (`npm run build`), which stays fast because it uses a batch Program
  // instead of the LanguageService.
  transform: { "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }] },
  testMatch: [
    "<rootDir>/src/**/*.spec.ts",
    "<rootDir>/test/features/**/*.steps.ts",
  ],
  // test/setup/env.ts pins DATABASE_URL to the peakform_test database and
  // sets JWT secrets before any app module is constructed.
  setupFiles: ["<rootDir>/test/setup/env.ts"],
  // All feature steps-files share the single peakform_test database and
  // TRUNCATE it between scenarios — parallel workers would wipe each other's
  // rows mid-scenario (shows up as flaky 401s), so the suite runs serially.
  maxWorkers: 1,
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"],
};
