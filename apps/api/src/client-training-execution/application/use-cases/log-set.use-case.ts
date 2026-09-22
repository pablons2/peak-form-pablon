import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import type { LogSetInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { TrainingPlanAccess } from "../../../training-plans/application/training-plan-access.service";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";
import { isSessionComplete } from "../../domain/session-completion";
import {
  EXERCISE_LOG_REPOSITORY,
  type ExerciseLogRepository,
} from "../../domain/ports/exercise-log.repository.port";
import { SessionExecutionComposer } from "../session-execution-composer.service";

// PRD 07 §5.2/§5.3/§5.4 — logs one set against a prescribed exercise, then
// re-checks §5.3's auto-completion rule across every exercise in the
// Session. Logging is allowed against a SCHEDULED **or already-MISSED**
// Session (§5.4's "late logging" — the Client can still log Tuesday for
// Monday's MISSED session, and the PRD's auto-completion rule in §5.3
// carries no exception for MISSED, so a late-but-complete log set still
// flips the Session to COMPLETED). Never against CANCELLED — a deliberate
// cancellation has nothing to log.
@Injectable()
export class LogSetUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EXERCISE_LOG_REPOSITORY) private readonly logs: ExerciseLogRepository,
    private readonly access: TrainingPlanAccess,
    private readonly composer: SessionExecutionComposer,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    sessionId: string;
    sessionExerciseId: string;
    data: LogSetInput;
  }) {
    const { session, plan } = await this.access.requirePlanForSession(input.sessionId);
    // Existence stays unobservable to a non-owner, same pattern
    // TrainingPlanAccess.assertCanView already uses elsewhere.
    if (plan.clientId !== input.actor.id) {
      throw new NotFoundException("Session not found");
    }
    if (session.status === SessionStatus.CANCELLED) {
      throw new ConflictException("Cannot log a set against a cancelled session");
    }
    const sessionExercise = session.sessionExercises.find(
      (e) => e.id === input.sessionExerciseId,
    );
    if (!sessionExercise) {
      throw new NotFoundException("Session exercise not found");
    }

    const setNumber = (await this.logs.countForSessionExercise(input.sessionExerciseId)) + 1;
    await this.logs.create({
      sessionExerciseId: input.sessionExerciseId,
      setNumber,
      actualReps: input.data.actualReps,
      actualLoad: input.data.actualLoad ?? null,
      actualRpeOrRir: input.data.actualRpeOrRir ?? null,
      note: input.data.note ?? null,
    });

    const allLogs = await this.logs.listForSession(input.sessionId);
    const progress = session.sessionExercises.map((e) => ({
      sessionExerciseId: e.id,
      targetSets: e.targetSets,
      loggedSets: allLogs.filter((l) => l.sessionExerciseId === e.id).length,
    }));
    let updatedSession = session;
    if (isSessionComplete(progress) && session.status !== SessionStatus.COMPLETED) {
      updatedSession = await this.sessions.markCompleted(input.sessionId);
    }

    return this.composer.compose(updatedSession, allLogs);
  }
}
