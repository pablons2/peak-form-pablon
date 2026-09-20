import type {
  ContraindicationTag,
  Difficulty,
  Equipment,
  Exercise,
  ExerciseVisibility,
  MuscleGroup,
} from "@prisma/client";

export const EXERCISE_REPOSITORY = Symbol("EXERCISE_REPOSITORY");

export type ExerciseWithTags = Exercise & {
  contraindicationTags: ContraindicationTag[];
  /// The authoring Professional's public identity — the admin review queue
  /// (§5.3) needs to show who submitted a custom exercise. Null for global
  /// records (imported or promoted).
  ownerProfessional: { id: string; fullName: string; email: string } | null;
};

/// The writable field set — matches the shared zod schemas in
/// packages/validation (contraindicationCodes become the M:N join to
/// ContraindicationTag rows).
export interface ExerciseWriteData {
  name?: string;
  mediaUrl?: string | null;
  muscleGroups?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty;
  cues?: string[];
  mistakes?: string[];
  contraindicationCodes?: string[];
}

export interface CreateExerciseData {
  name: string;
  mediaUrl?: string | null;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  cues: string[];
  mistakes: string[];
  contraindicationCodes: string[];
  visibility: ExerciseVisibility;
  ownerProfessionalId?: string | null;
  sourceApiId?: string | null;
  sourceHash?: string | null;
}

export interface UpdateExerciseData extends ExerciseWriteData {
  /// Promotion flips visibility and clears the owner (PRD 05 §6 — global
  /// records have no ownerProfessionalId). Pass null explicitly to clear.
  visibility?: ExerciseVisibility;
  ownerProfessionalId?: string | null;
  /// Re-imports refresh the snapshot hash so unchanged rows skip next time.
  sourceHash?: string;
}

/// Who the caller is allowed to see — resolved once per request by the
/// Application layer (ExerciseAccess) so the repository stays a dumb query.
export interface ExerciseVisibilityScope {
  /// ADMIN — sees everything, including other users' PRIVATE customs.
  unrestricted?: boolean;
  /// ownerProfessionalIds whose PRIVATE rows are visible to this viewer.
  privateOwnerIds: string[];
}

export interface ExerciseSearchFilters {
  q?: string;
  muscleGroup?: MuscleGroup;
  equipment?: Equipment;
  difficulty?: Difficulty;
  /// §5.3 admin review queue filters PRIVATE; undefined means "all visible".
  visibility?: ExerciseVisibility;
  /// "My exercises" — restrict to rows owned by this user id.
  ownerId?: string;
}

/// Infrastructure implements this (base doc §7.2 DIP); Application use-cases
/// depend only on this interface. Deliberately CRUD/query-shaped — ownership,
/// visibility and promotion rules live in the use-cases.
export interface ExerciseRepository {
  findById(id: string): Promise<ExerciseWithTags | null>;
  findBySourceApiId(sourceApiId: string): Promise<Exercise | null>;
  search(
    scope: ExerciseVisibilityScope,
    filters: ExerciseSearchFilters,
  ): Promise<ExerciseWithTags[]>;
  create(data: CreateExerciseData): Promise<ExerciseWithTags>;
  update(id: string, data: UpdateExerciseData): Promise<ExerciseWithTags>;
  delete(id: string): Promise<void>;
}
