import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ExerciseVisibility } from "@prisma/client";
import {
  CONTRAINDICATION_TAG_REPOSITORY,
  type ContraindicationTagRepository,
} from "../../domain/ports/contraindication-tag.repository.port";
import {
  EXERCISE_DATASET_SOURCE,
  type DatasetExerciseEntry,
  type ExerciseDatasetSource,
} from "../../domain/ports/exercise-dataset-source.port";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import {
  MEDIA_STORE,
  type MediaStore,
} from "../../domain/ports/media-store.port";

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

// PRD 05 §5.1 — one-time (re-runnable) catalog import. A static dataset
// snapshot feeds Exercise rows whose media is re-hosted in our own object
// storage — the request path never touches a third-party API. Idempotent by
// `sourceApiId` + `sourceHash`: an unchanged entry is skipped entirely (no
// write, no media re-upload); a changed entry updates the row in place and
// re-uploads its media under the same deterministic key.
@Injectable()
export class ImportExerciseCatalogUseCase {
  private readonly logger = new Logger(ImportExerciseCatalogUseCase.name);

  constructor(
    @Inject(EXERCISE_DATASET_SOURCE)
    private readonly dataset: ExerciseDatasetSource,
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    @Inject(CONTRAINDICATION_TAG_REPOSITORY)
    private readonly tags: ContraindicationTagRepository,
    @Inject(MEDIA_STORE) private readonly media: MediaStore,
  ) {}

  async execute(): Promise<ImportResult> {
    const entries = await this.dataset.listEntries();

    // Fail the whole run before writing anything if the dataset references a
    // tag code the vocabulary doesn't have — a half-imported catalog with
    // silently dropped contraindications is worse than no import.
    const referencedCodes = [
      ...new Set(entries.flatMap((e) => e.contraindicationCodes)),
    ];
    const existing = await this.tags.existingCodes(referencedCodes);
    const unknown = referencedCodes.filter((c) => !existing.has(c));
    if (unknown.length > 0) {
      throw new Error(
        `Dataset references unknown contraindication tag(s): ${unknown.join(", ")}`,
      );
    }

    const result: ImportResult = {
      total: entries.length,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const entry of entries) {
      const mediaBytes = await this.dataset.readMedia(entry);
      const sourceHash = hashEntry(entry, mediaBytes);
      const existingRow = await this.exercises.findBySourceApiId(
        entry.sourceApiId,
      );

      if (existingRow && existingRow.sourceHash === sourceHash) {
        result.skipped++;
        continue;
      }

      const mediaUrl = await this.media.put(
        `exercises/${entry.sourceApiId}${entry.media.extension}`,
        mediaBytes,
        entry.media.contentType,
      );

      const data = {
        name: entry.name,
        mediaUrl,
        muscleGroups: entry.muscleGroups,
        equipment: entry.equipment,
        difficulty: entry.difficulty,
        cues: entry.cues,
        mistakes: entry.mistakes,
        contraindicationCodes: entry.contraindicationCodes,
      };

      if (existingRow) {
        await this.exercises.update(existingRow.id, { ...data, sourceHash });
        result.updated++;
      } else {
        await this.exercises.create({
          ...data,
          sourceApiId: entry.sourceApiId,
          sourceHash,
          visibility: ExerciseVisibility.GLOBAL,
          ownerProfessionalId: null,
        });
        result.created++;
      }
    }

    this.logger.log(
      `Exercise catalog import: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped (${result.total} total)`,
    );
    return result;
  }
}

function hashEntry(entry: DatasetExerciseEntry, mediaBytes: Buffer): string {
  const mediaHash = createHash("sha256").update(mediaBytes).digest("hex");
  return createHash("sha256")
    .update(JSON.stringify({ ...entry, mediaHash }))
    .digest("hex");
}
