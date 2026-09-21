import { Injectable } from "@nestjs/common";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

@Injectable()
export class GetSessionUseCase {
  constructor(private readonly access: TrainingPlanAccess) {}

  async execute(input: { viewer: UserWithProfiles; sessionId: string }) {
    const { session, plan } = await this.access.requirePlanForSession(input.sessionId);
    this.access.assertCanView(plan, input.viewer);
    return session;
  }
}
