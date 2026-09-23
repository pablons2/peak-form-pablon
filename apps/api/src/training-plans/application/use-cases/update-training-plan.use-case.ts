import { Inject, Injectable } from "@nestjs/common";
import type { UpdateTrainingPlanInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  DOMAIN_EVENT_BUS,
  type DomainEventBus,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type TrainingPlanRepository,
} from "../../domain/ports/training-plan.repository.port";
import { TrainingPlanAccess } from "../training-plan-access.service";
import { emitPlanUpdated } from "../plan-updated";

// PRD 06 §5.1 — edit name/startDate/status. Ownership only (§4) — this
// module has no separate intake-gating re-check on edit, since the gate is
// a creation-time rule (§5.1's wording is specifically "creating a plan").
@Injectable()
export class UpdateTrainingPlanUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    private readonly access: TrainingPlanAccess,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    planId: string;
    data: UpdateTrainingPlanInput;
  }) {
    const plan = await this.access.requirePlan(input.planId);
    this.access.assertProfessionalOwnsPlan(plan, input.actor);
    const updated = await this.plans.update(plan.id, input.data);
    // PRD 12 §5.1 — includes the DRAFT -> ACTIVE flip itself ("your plan
    // is ready"), gated to ACTIVE by the helper.
    await emitPlanUpdated(this.events, updated, input.actor.id);
    return updated;
  }
}
