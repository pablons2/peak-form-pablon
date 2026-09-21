import { Inject, Injectable } from "@nestjs/common";
import type { CreateMesocycleInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";

// PRD 06 §5.2 — adds a mesocycle to a plan. `order` is always
// server-assigned (repository does `max(order)+1`), never client-supplied.
@Injectable()
export class CreateMesocycleUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    private readonly access: TrainingPlanAccess,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    planId: string;
    data: CreateMesocycleInput;
  }) {
    const plan = await this.access.requirePlan(input.planId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);
    return this.plans.createMesocycle({
      trainingPlanId: plan.id,
      weeks: input.data.weeks,
      goal: input.data.goal,
      isDeload: input.data.isDeload,
    });
  }
}
