/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
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
