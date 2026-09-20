import { readFile } from "node:fs/promises";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  difficultySchema,
  equipmentSchema,
  muscleGroupSchema,
} from "@peakform/validation";
import type {
  DatasetExerciseEntry,
  ExerciseDatasetSource,
} from "../domain/ports/exercise-dataset-source.port";

// The bundled dataset's on-disk shape — validated at load time so a malformed
// snapshot fails the import loudly instead of writing partial rows.
const datasetEntrySchema = z.object({
  sourceApiId: z.string().min(1),
  name: z.string().min(1),
  muscleGroups: z.array(muscleGroupSchema).min(1),
  equipment: z.array(equipmentSchema).min(1),
  difficulty: difficultySchema,
  cues: z.array(z.string().min(1)).min(1),
  mistakes: z.array(z.string().min(1)).min(1),
  contraindicationCodes: z.array(z.string().min(1)).default([]),
  media: z.object({
    file: z.string().min(1).optional(),
    url: z.string().url().optional(),
    contentType: z.string().min(1),
    extension: z.string().min(1),
  }),
});
const datasetFileSchema = z.array(datasetEntrySchema).min(1);

const MEDIA_FETCH_TIMEOUT_MS = 15_000;

// PRD 05 §5.1 — static, self-hosted dataset adapter. Reads a JSON snapshot +
// its bundled media from disk (EXERCISE_DATASET_DIR, defaulting to
// apps/api/exercise-catalog). A newer real-world snapshot (e.g. a refreshed
// GitHub exercise dataset normalized to this shape) drops in by pointing the
// env var at it — no code change.
@Injectable()
export class JsonFileExerciseDataset implements ExerciseDatasetSource {
  private readonly dir =
    process.env.EXERCISE_DATASET_DIR ??
    path.join(process.cwd(), "exercise-catalog");

  async listEntries(): Promise<DatasetExerciseEntry[]> {
    const raw = await readFile(path.join(this.dir, "exercises.json"), "utf8");
    return datasetFileSchema.parse(JSON.parse(raw));
  }

  async readMedia(entry: DatasetExerciseEntry): Promise<Buffer> {
    if (entry.media.file) {
      // Bundled media: the snapshot is fully self-contained, so importing
      // works offline and never depends on the source's hosting.
      return readFile(path.join(this.dir, entry.media.file));
    }
    if (entry.media.url) {
      // Import-time fetch only — never on a user-facing request path.
      const res = await fetch(entry.media.url, {
        signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(
          `Failed to fetch media for ${entry.sourceApiId}: HTTP ${res.status}`,
        );
      }
      return Buffer.from(await res.arrayBuffer());
    }
    throw new Error(
      `Dataset entry ${entry.sourceApiId} has neither media.file nor media.url`,
    );
  }
}
