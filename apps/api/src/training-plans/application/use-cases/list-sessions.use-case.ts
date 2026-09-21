import { Inject, Injectable } from "@nestjs/common";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/ports/session.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §7 — the calendar/review list of a mesocycle's generated sessions.
@Injectable()
export class ListSessionsUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly access: TrainingPlanAccess,
  ) {}

  async execute(input: { viewer: UserWithProfiles; mesocycleId: string }) {
    const { plan } = await this.access.requirePlanForMesocycle(input.mesocycleId);
    this.access.assertCanView(plan, input.viewer);
    return this.sessions.listForMesocycle(input.mesocycleId);
  }
}
