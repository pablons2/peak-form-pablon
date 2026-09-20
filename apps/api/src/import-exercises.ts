import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ImportExerciseCatalogUseCase } from "./exercises/application/use-cases/import-exercise-catalog.use-case";

// PRD 05 §5.1 — the catalog import job's entry point. Boots the real
// application context (real Prisma, real S3 media store, real dataset
// adapter) and runs the same use-case the BDD suite exercises. Idempotent —
// safe to re-run; unchanged entries are skipped by sourceHash.
//
//   dev:      npm run exercises:import            (inside the api container)
//   prod:     node dist/import-exercises.js       (after nest build)
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  try {
    const result = await app
      .get(ImportExerciseCatalogUseCase)
      .execute();
    console.log(
      `Import finished: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped (${result.total} in dataset)`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error("Exercise catalog import failed:", err);
  process.exit(1);
});
