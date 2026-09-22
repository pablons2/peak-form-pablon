import type { ExerciseLog } from "@prisma/client";

export const EXERCISE_LOG_REPOSITORY = Symbol("EXERCISE_LOG_REPOSITORY");

export interface CreateExerciseLogInput {
  sessionExerciseId: string;
  setNumber: number;
  actualReps: number;
  actualLoad: number | null;
  actualRpeOrRir: number | null;
  note: string | null;
}

/// One prior log, annotated with the session date it was logged against —
/// the "last time" reference (§5.2) is chronological by the Session's own
/// date, not by when the Client happened to submit the log (late logging,
/// §5.4, must never make a late entry look like the most recent training
/// occurrence).
export type ExerciseLogWithSessionDate = ExerciseLog & { sessionDate: Date };

/// Infrastructure implements this (base doc §7.2 DIP). ExerciseLog is this
/// module's own entity (unlike Session, owned by PRD 06's training-plans
/// module) — see session.repository.port.ts's Phase 9 additions for the
/// counterpart queries that walk Session -> Mesocycle -> TrainingPlan.
export interface ExerciseLogRepository {
  countForSessionExercise(sessionExerciseId: string): Promise<number>;
  create(input: CreateExerciseLogInput): Promise<ExerciseLog>;
  listForSession(sessionId: string): Promise<ExerciseLog[]>;
  hasAnyLogForSession(sessionId: string): Promise<boolean>;
  /// Most recent prior log of the same exerciseId for this Client, excluding
  /// the current Session — the "last time: 60kg × 8 @ RPE8" reference
  /// (§5.2).
  findLastForClientAndExercise(
    clientId: string,
    exerciseId: string,
    excludeSessionId: string,
  ): Promise<ExerciseLogWithSessionDate | null>;
}
