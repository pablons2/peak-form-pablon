import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Role, type NutritionPlan } from "@prisma/client";
import type { ConfirmNutritionPlanInput } from "@peakform/validation";
import {
  DOMAIN_EVENT_BUS,
  PLAN_UPDATED,
  type DomainEventBus,
  type PlanUpdatedPayload,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

// PRD 08 §5.2 — the Nutritionist reviews the draft, edits the numbers as
// needed, and explicitly confirms in one action. This is the *only* write
// path that can move a plan to ACTIVE (§3's Non-Goal), and
// NutritionRepository.confirm always sets confirmedByProfessionalAt in the
// same call — there is no way to reach ACTIVE without it. Also doubles as
// the "edit an already-ACTIVE target" path (§5.2: "any subsequent change...
// also requires an explicit Nutritionist save action") — re-confirming an
// ACTIVE plan just re-stamps confirmedByProfessionalAt to the edit moment,
// which is the correct semantics (it *was* just re-confirmed).
@Injectable()
export class ConfirmNutritionPlanUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    planId: string;
    data: ConfirmNutritionPlanInput;
  }): Promise<NutritionPlan> {
    const plan = await this.nutrition.findById(input.planId);
    if (!plan) throw new NotFoundException("Nutrition plan not found");

    await this.access.assertCanManagePlanFor(input.actor, plan.clientId);

    if (plan.status === "ARCHIVED") {
      throw new BadRequestException("Cannot confirm an archived nutrition plan");
    }

    const confirmed = await this.nutrition.confirm(input.planId, {
      calorieTarget: input.data.calorieTarget,
      macroTargets: input.data.macroTargets,
      mealPlan: input.data.mealPlan ?? null,
    });

    // PRD 12 §5.1 — "plan updated" for the Client. Confirm is the only
    // write path that touches what the Client sees (drafts are invisible
    // to them, §5.2), so it's the only nutrition use-case that emits.
    const payload: PlanUpdatedPayload = {
      planKind: "NUTRITION",
      planId: confirmed.id,
      clientId: confirmed.clientId,
      professionalId: input.actor.id,
      date: new Date().toISOString().slice(0, 10),
    };
    await this.events.emit({ name: PLAN_UPDATED, payload });

    return confirmed;
  }
}
