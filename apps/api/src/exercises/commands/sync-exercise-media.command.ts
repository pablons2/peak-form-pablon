import { Command, CommandRunner } from "nest-commander";
import { SyncExerciseMediaService } from "../infrastructure/sync-exercise-media.service";

@Command({
  name: "sync:exercise-media",
  description: "Sync exercise media from external dataset",
})
export class SyncExerciseMediaCommand extends CommandRunner {
  constructor(private syncService: SyncExerciseMediaService) {
    super();
  }

  async run(
    passedParam: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    const datasetPath = options?.dataset || passedParam[0] || "/tmp/exercises-dataset";

    console.log(`Starting sync from: ${datasetPath}`);
    console.time("Sync duration");

    try {
      const result = await this.syncService.syncMediaFromDataset(datasetPath);
      console.timeEnd("Sync duration");
      console.log("\n✅ Sync completed successfully!");
      console.log(`📊 Results:`);
      console.log(`   Processed: ${result.processed}`);
      console.log(`   Uploaded:  ${result.uploaded}`);
      console.log(`   Updated:   ${result.updated}`);
      console.log(`   Errors:    ${result.errors}`);
    } catch (error) {
      console.timeEnd("Sync duration");
      console.error("\n❌ Sync failed:", error);
      process.exit(1);
    }
  }
}
