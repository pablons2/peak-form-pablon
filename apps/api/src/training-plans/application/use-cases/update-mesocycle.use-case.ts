import { Inject, Injectable } from "@nestjs/common";
import type { UpdateMesocycleInput } from "@peakform/validation";
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

// PRD 06 §5.2/§6 — edit weeks/goal/isDeload. Resizing `weeks` never
// touches already-generated Sessions or shifts any stored date — every
// later mesocycle's effective start date is *computed*, so the shift is
// automatic the next time it's read (§6).
@Injectable()
export class UpdateMesocycleUseCase {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    private readonly access: TrainingPlanAccess,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    mesocycleId: string;
    data: UpdateMesocycleInput;
  }) {
    const { mesocycle, plan } = await this.access.requirePlanForMesocycle(
      input.mesocycleId,
    );
    this.access.assertProfessionalOwnsPlan(plan, input.actor);
    const updated = await this.plans.updateMesocycle(mesocycle.id, input.data);
    await emitPlanUpdated(this.events, plan, input.actor.id);
    return updated;
  }
}
