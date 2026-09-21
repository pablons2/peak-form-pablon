import { Injectable } from "@nestjs/common";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { ClonePlanService } from "../clone-plan.service";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.7 — "duplicate ... a single mesocycle as a starting point for a
// different client (or a future block for the same client)". The target
// plan can be any plan the caller owns (including the source plan itself,
// for "a future block for the same client").
@Injectable()
export class CloneMesocycleUseCase {
  constructor(
    private readonly access: TrainingPlanAccess,
    private readonly cloneService: ClonePlanService,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    sourceMesocycleId: string;
    targetPlanId: string;
  }) {
    const { mesocycle: sourceMesocycle, plan: sourcePlan } =
      await this.access.requirePlanForMesocycle(input.sourceMesocycleId);
    if (!sourcePlan.isStarterTemplate) {
      this.access.assertProfessionalOwnsPlan(sourcePlan, input.actor);
    }

    const targetPlan = await this.access.requirePlan(input.targetPlanId);
    this.access.assertProfessionalOwnsPlan(targetPlan, input.actor);

    return this.cloneService.cloneOneMesocycleInto(sourceMesocycle, targetPlan.id);
  }
}
