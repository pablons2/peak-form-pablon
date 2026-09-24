import { Inject, Injectable } from "@nestjs/common";
import { TrainingPlanStatus } from "@prisma/client";
import type { UpdateTrainingPlanInput } from "@peakform/validation";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import {
  DOMAIN_EVENT_BUS,
  TRAINING_PLAN_CREATED,
  type DomainEventBus,
  type TrainingPlanCreatedPayload,
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
    // Training-refactor Fase 4 — the first publish (DRAFT -> ACTIVE) is the
    // "you got a new plan" moment, not an edit: it gets its own notification
    // type so the copy can say so. Edits to an already-visible plan keep
    // PRD 12 §5.1's PLAN_UPDATED path (same-day dedupe stays in the
    // dispatcher).
    if (
      plan.status === TrainingPlanStatus.DRAFT &&
      updated.status === TrainingPlanStatus.ACTIVE &&
      updated.clientId
    ) {
      const payload: TrainingPlanCreatedPayload = {
        planId: updated.id,
        clientId: updated.clientId,
        professionalId: updated.professionalId ?? input.actor.id,
        planName: updated.name,
      };
      await this.events.emit({ name: TRAINING_PLAN_CREATED, payload });
    } else {
      await emitPlanUpdated(this.events, updated, input.actor.id);
    }
    return updated;
  }
}
