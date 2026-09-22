import { Inject, Injectable } from "@nestjs/common";
import type { ExerciseLog } from "@prisma/client";
import type { SessionWithExercises } from "../../training-plans/domain/ports/session.repository.port";
import {
  EXERCISE_LOG_REPOSITORY,
  type ExerciseLogRepository,
} from "../domain/ports/exercise-log.repository.port";

export interface SessionExerciseLogView {
  id: string;
  setNumber: number;
  actualReps: number;
  actualLoad: number | null;
  actualRpeOrRir: number | null;
  note: string | null;
  loggedAt: Date;
}

export interface LastTimeReference {
  actualReps: number;
  actualLoad: number | null;
  actualRpeOrRir: number | null;
  sessionDate: Date;
}

export interface SessionExerciseExecutionView {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number | null;
  targetLoad: number | null;
  targetPercent1RM: number | null;
  targetRpe: number | null;
  targetRir: number | null;
  restSeconds: number | null;
  tempo: string | null;
  notes: string | null;
  logs: SessionExerciseLogView[];
  lastTime: LastTimeReference | null;
}

export interface SessionExecutionView {
  id: string;
  mesocycleId: string;
  date: Date;
  originalDate: Date | null;
  status: string;
  overriddenFromTemplate: boolean;
  exercises: SessionExerciseExecutionView[];
}

function toLogView(log: ExerciseLog): SessionExerciseLogView {
  return {
    id: log.id,
    setNumber: log.setNumber,
    actualReps: log.actualReps,
    actualLoad: log.actualLoad,
    actualRpeOrRir: log.actualRpeOrRir,
    note: log.note,
    loggedAt: log.loggedAt,
  };
}

// Merges a training-plans Session (with its prescribed SessionExercises)
// with this module's own ExerciseLog rows into one response shape — the
// composition point between the two modules' entities, kept out of both
// repositories so neither has to know about the other's schema.
@Injectable()
export class SessionExecutionComposer {
  constructor(
    @Inject(EXERCISE_LOG_REPOSITORY)
    private readonly logs: ExerciseLogRepository,
  ) {}

  // History views (§5.1/§5.4, and the Professional's read-only view) — each
  // exercise's own logs, no "last time" lookup (that's specific to the
  // in-progress logging moment, §5.2).
  compose(session: SessionWithExercises, allLogs: ExerciseLog[]): SessionExecutionView {
    return {
      id: session.id,
      mesocycleId: session.mesocycleId,
      date: session.date,
      originalDate: session.originalDate,
      status: session.status,
      overriddenFromTemplate: session.overriddenFromTemplate,
      exercises: session.sessionExercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: e.exercise.name,
        order: e.order,
        targetSets: e.targetSets,
        targetRepsMin: e.targetRepsMin,
        targetRepsMax: e.targetRepsMax,
        targetLoad: e.targetLoad,
        targetPercent1RM: e.targetPercent1RM,
        targetRpe: e.targetRpe,
        targetRir: e.targetRir,
        restSeconds: e.restSeconds,
        tempo: e.tempo,
        notes: e.notes,
        logs: allLogs.filter((l) => l.sessionExerciseId === e.id).map(toLogView),
        lastTime: null,
      })),
    };
  }

  // §5.2 — the "today" view additionally carries each exercise's most recent
  // prior log for this Client, the "Last time: 60kg × 8 @ RPE8" reference.
  async composeWithLastTime(
    session: SessionWithExercises,
    allLogs: ExerciseLog[],
    clientId: string,
  ): Promise<SessionExecutionView> {
    const base = this.compose(session, allLogs);
    const exercises = await Promise.all(
      base.exercises.map(async (e) => {
        const last = await this.logs.findLastForClientAndExercise(
          clientId,
          e.exerciseId,
          session.id,
        );
        return {
          ...e,
          lastTime: last
            ? {
                actualReps: last.actualReps,
                actualLoad: last.actualLoad,
                actualRpeOrRir: last.actualRpeOrRir,
                sessionDate: last.sessionDate,
              }
            : null,
        };
      }),
    );
    return { ...base, exercises };
  }
}
