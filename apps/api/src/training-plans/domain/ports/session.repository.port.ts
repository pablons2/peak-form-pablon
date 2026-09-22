import type { Session, SessionExercise } from "@prisma/client";
import type { WeeklyTemplateExerciseWriteData } from "./training-plan.repository.port";

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");

export type SessionExerciseWithExercise = SessionExercise & {
  exercise: { id: string; name: string; contraindicationTags: { code: string }[] };
};

export type SessionWithExercises = Session & {
  sessionExercises: SessionExerciseWithExercise[];
};

export interface GenerateSessionData {
  date: Date;
  exercises: WeeklyTemplateExerciseWriteData[];
}

/// Infrastructure implements this (base doc §7.2 DIP). Deliberately
/// CRUD/query-shaped — the generation algorithm (which dates to create) and
/// the move/cancel/edit business rules live in the use-cases.
export interface SessionRepository {
  findById(id: string): Promise<SessionWithExercises | null>;
  listForMesocycle(mesocycleId: string): Promise<SessionWithExercises[]>;
  /// ISO ("YYYY-MM-DD") dates that already have a Session row for this
  /// mesocycle — the generation use-case diffs candidate dates against this
  /// set so generation stays additive-only (PRD 06 §5.4).
  existingDatesForMesocycle(mesocycleId: string): Promise<Set<string>>;
  /// One Session (with its copied exercises) per entry — used only for
  /// slots confirmed not to exist yet.
  generateMany(mesocycleId: string, sessions: GenerateSessionData[]): Promise<void>;

  move(id: string, newDate: Date): Promise<SessionWithExercises>;
  cancel(id: string): Promise<SessionWithExercises>;
  replaceExercises(
    id: string,
    exercises: WeeklyTemplateExerciseWriteData[],
  ): Promise<SessionWithExercises>;

  /// PRD 07 §5.1 — "today" resolution walks Session -> Mesocycle ->
  /// TrainingPlan.clientId, the same ownership-walk pattern
  /// TrainingPlanAccess already uses for Professional-side checks. Session
  /// carries no owner of its own, so this query lives on the port that owns
  /// Session rather than in PRD 07's own module (same "the owning module
  /// extends its own port when a new module needs a new query on it"
  /// precedent IntakeModule/IntakeGatingService set for PRD 06).
  findByClientAndDate(clientId: string, date: Date): Promise<SessionWithExercises | null>;
  /// A Client's full session history across every plan, newest first (PRD 07
  /// §5.1/§5.4 — also read by the Professional's read-only view, §4).
  listForClient(clientId: string): Promise<SessionWithExercises[]>;
  /// Still-SCHEDULED sessions whose date is strictly before `before` — PRD 07
  /// §5.4's missed-session job candidates (CANCELLED sessions are excluded by
  /// the status filter itself, not by the caller).
  findScheduledPastDue(before: Date): Promise<SessionWithExercises[]>;
  markMissed(id: string): Promise<SessionWithExercises>;
  markCompleted(id: string): Promise<SessionWithExercises>;
}
