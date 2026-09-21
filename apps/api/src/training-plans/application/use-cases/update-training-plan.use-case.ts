import { Inject, Injectable } from "@nestjs/common";
import type { UpdateTrainingPlanInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.1 — edit name/startDate/status. Ownership only (§4) — this
// module has no separate intake-gating re-check on edit, since the gate is
// a creation-time rule (§5.1's wording is specifically "creating a plan").
@Injectable()
export class UpdateTrainingPlanUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    private readonly access: TrainingPlanAccess,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    planId: string;
    data: UpdateTrainingPlanInput;
  }) {
    const plan = await this.access.requirePlan(input.planId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);
    return this.plans.update(plan.id, input.data);
  }
}
