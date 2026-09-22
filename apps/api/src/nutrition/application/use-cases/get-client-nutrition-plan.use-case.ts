import { Inject, Injectable } from "@nestjs/common";
import { Role, type NutritionPlan } from "@prisma/client";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

// PRD 08 §4/§7 — the Nutritionist-only review screen: the Client's latest
// plan of ANY status, including DRAFT — this is the one place a DRAFT is
// meant to be visible. Never reachable by a Client (role-gated at the
// controller, plus this always goes through the Professional/Admin-only
// assertCanManagePlanFor check).
@Injectable()
export class GetClientNutritionPlanUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    clientId: string;
  }): Promise<NutritionPlan | null> {
    await this.access.assertCanManagePlanFor(input.actor, input.clientId);
    return this.nutrition.findLatestForClient(input.clientId);
  }
}
