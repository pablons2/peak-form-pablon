import { Inject, Injectable } from "@nestjs/common";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/ports/session.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.4 — status becomes CANCELLED (never MISSED — that's a deliberate
// planned cancellation, distinct from PRD 07's no-show auto-flag), and no
// replacement session is auto-created.
@Injectable()
export class CancelSessionUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly access: TrainingPlanAccess,
  ) {}

  async execute(input: { actor: UserWithProfiles; sessionId: string }) {
    const { plan } = await this.access.requirePlanForSession(input.sessionId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);
    return this.sessions.cancel(input.sessionId);
  }
}
