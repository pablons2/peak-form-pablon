import { Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";
import {
  EXERCISE_LOG_REPOSITORY,
  type ExerciseLogRepository,
} from "../../domain/ports/exercise-log.repository.port";
import { SessionExecutionComposer } from "../session-execution-composer.service";
import { TrainingExecutionAccess } from "../training-execution-access.service";

// PRD 07 §4 — read-only view of a Client's execution history for a
// Professional or an Admin. Admin gets the table's "✅ (all)" bypass (no
// link required, same admin-unrestricted pattern as
// TrainingPlanAccess.resolveProfessionalForClient); a Professional caller
// must hold an ACTIVE PERSONAL_TRAINER link to that Client (see
// TrainingExecutionAccess for why this is narrower than Intake/Body
// Assessment's "any specialization" precedent).
@Injectable()
export class ListClientSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(EXERCISE_LOG_REPOSITORY) private readonly logs: ExerciseLogRepository,
    private readonly composer: SessionExecutionComposer,
    private readonly access: TrainingExecutionAccess,
  ) {}

  async execute(input: { actor: UserWithProfiles; clientId: string }) {
    if (input.actor.role !== Role.ADMIN) {
      await this.access.assertProfessionalLinkedToClient(input.actor.id, input.clientId);
    }
    const sessions = await this.sessions.listForClient(input.clientId);
    return Promise.all(
      sessions.map(async (session) => {
        const allLogs = await this.logs.listForSession(session.id);
        return this.composer.compose(session, allLogs);
      }),
    );
  }
}
