import { Inject, Injectable } from "@nestjs/common";
import { Role, type NutritionPlan } from "@prisma/client";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

// PRD 08 §5.2/§7 — the acompanhamento panel's plan history: every plan
// (DRAFT/ACTIVE/ARCHIVED) authored for a Client, newest first. Same
// NUTRITIONIST + ACTIVE-link access condition as every other
// Professional-facing read in this module (§4's table).
@Injectable()
export class ListClientPlansUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    clientId: string;
  }): Promise<NutritionPlan[]> {
    await this.access.assertCanManagePlanFor(input.actor, input.clientId);
    return this.nutrition.listForClient(input.clientId);
  }
}
