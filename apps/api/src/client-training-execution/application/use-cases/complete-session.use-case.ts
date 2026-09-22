import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { TrainingPlanAccess } from "../../../training-plans/application/training-plan-access.service";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";
import {
  EXERCISE_LOG_REPOSITORY,
  type ExerciseLogRepository,
} from "../../domain/ports/exercise-log.repository.port";
import { SessionExecutionComposer } from "../session-execution-composer.service";

// PRD 07 §5.3 — manual "mark complete" for when the Client did fewer sets
// than prescribed but is done for the day. This never fabricates missing
// set data — it only transitions status; whatever was actually logged (or
// nothing at all) stays exactly as logged.
@Injectable()
export class CompleteSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EXERCISE_LOG_REPOSITORY) private readonly logs: ExerciseLogRepository,
    private readonly access: TrainingPlanAccess,
    private readonly composer: SessionExecutionComposer,
  ) {}

  async execute(input: { actor: UserWithProfiles; sessionId: string }) {
    const { session, plan } = await this.access.requirePlanForSession(input.sessionId);
    if (plan.clientId !== input.actor.id) {
      throw new NotFoundException("Session not found");
    }
    if (session.status === SessionStatus.CANCELLED) {
      throw new ConflictException("Cannot complete a cancelled session");
    }
    const updated =
      session.status === SessionStatus.COMPLETED
        ? session
        : await this.sessions.markCompleted(input.sessionId);
    const allLogs = await this.logs.listForSession(input.sessionId);
    return this.composer.compose(updated, allLogs);
  }
}
