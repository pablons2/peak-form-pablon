import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SyncExerciseMediaService } from "./exercises/infrastructure/sync-exercise-media.service";

// Sync exercise media from external dataset to PeakForm.
// Runs incrementally: only updates exercises without media.
//
//   dev:      npm run sync:exercise-media            (inside the api container)
//   prod:     node dist/sync-exercise-media.js       (after nest build)
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  try {
    const datasetPath = process.argv[2] || "/tmp/exercises-dataset";
    const syncService = app.get(SyncExerciseMediaService);

    console.log(`Starting sync from: ${datasetPath}`);
    console.time("Sync duration");

    const result = await syncService.syncMediaFromDataset(datasetPath);

    console.timeEnd("Sync duration");
    console.log("\n✅ Sync completed successfully!");
    console.log(`📊 Results:`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Uploaded:  ${result.uploaded}`);
    console.log(`   Updated:   ${result.updated}`);
    console.log(`   Errors:    ${result.errors}`);
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error("Exercise media sync failed:", err);
  process.exit(1);
});
