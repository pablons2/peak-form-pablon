import { Injectable } from "@nestjs/common";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §4 — "View a plan: Admin ✅, Professional ✅ (own clients),
// Client ✅ (own, read-only)". Starter Templates are browsable by anyone
// authenticated (§5.8).
@Injectable()
export class GetTrainingPlanUseCase {
  constructor(private readonly access: TrainingPlanAccess) {}

  async execute(input: { viewer: UserWithProfiles; planId: string }) {
    const plan = await this.access.requirePlan(input.planId);
    this.access.assertCanView(plan, input.viewer);
    return plan;
  }
}
