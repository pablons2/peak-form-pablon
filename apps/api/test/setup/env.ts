// BDD/unit test environment — loaded via jest `setupFiles` before every test
// file, so these are set before AppModule/PrismaService are ever constructed.
//
// DATABASE_URL is pinned to the dedicated test database (PRD 15 §5.2 — a real
// Postgres DB on the dockerized postgres service, migrated via
// `prisma migrate deploy`), never the dev database: scenarios TRUNCATE all
// tables between runs. Point TEST_DATABASE_URL elsewhere if your postgres
// isn't reachable on localhost:5432 (e.g. running jest inside the api
// container: postgresql://peakform:peakform_dev@postgres:5432/peakform_test).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://peakform:peakform_dev@localhost:5432/peakform_test?schema=public";
process.env.JWT_ACCESS_SECRET ??= "test_access_secret";
process.env.JWT_REFRESH_SECRET ??= "test_refresh_secret";
// BDD scenarios invoke RunCheckInDueJobUseCase directly for determinism —
// keep the real 60s interval job out of the way during tests.
process.env.CHECK_IN_SCHEDULER_DISABLED ??= "1";
// Same reasoning, PRD 07 §5.4 — scenarios invoke RunMissedSessionJobUseCase
// directly.
process.env.MISSED_SESSION_SCHEDULER_DISABLED ??= "1";
// PRD 12 — the three notification-producing jobs this phase adds follow
// the same convention: scenarios invoke the use-cases directly.
process.env.SESSION_REMINDER_SCHEDULER_DISABLED ??= "1";
process.env.MISSED_FOOD_LOG_SCHEDULER_DISABLED ??= "1";
process.env.WEEKLY_SUMMARY_SCHEDULER_DISABLED ??= "1";
