import type {
  Difficulty,
  Equipment,
  MuscleGroup,
} from "@prisma/client";

export const EXERCISE_DATASET_SOURCE = Symbol("EXERCISE_DATASET_SOURCE");

/// One row of a static open-source exercise dataset (PRD 05 §5.1), already
/// normalized onto our controlled vocabularies — the Infrastructure adapter
/// is responsible for mapping the source dataset's shape to these fields.
export interface DatasetExerciseEntry {
  /// Stable id inside the source dataset; becomes Exercise.sourceApiId, the
  /// import's idempotency key.
  sourceApiId: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  cues: string[];
  mistakes: string[];
  contraindicationCodes: string[];
  /// Where the movement's GIF/video comes from: a file inside the dataset
  /// bundle, or a remote URL to fetch once at import time.
  media: {
    file?: string;
    url?: string;
    contentType: string;
    extension: string;
  };
}

/// A static exercise dataset snapshot (PRD 05 §5.1 — JSON + media, open
/// license). The bundled dev catalog is one adapter; a newer real-world
/// snapshot drops in behind the same port without touching the import logic.
export interface ExerciseDatasetSource {
  listEntries(): Promise<DatasetExerciseEntry[]>;
  /// Resolve an entry's media to bytes — reads a bundled file or fetches the
  /// remote URL once. Import-time only; never on a user request path.
  readMedia(entry: DatasetExerciseEntry): Promise<Buffer>;
}
