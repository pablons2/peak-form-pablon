import { Inject, Injectable } from "@nestjs/common";
import type { NutritionPlan } from "@prisma/client";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";

// PRD 08 §5.1/§7 — the Client's own view. Calls
// NutritionRepository.findActiveForClient specifically (never
// findLatestForClient) — that method's own contract guarantees a DRAFT can
// never come back here, so there is no leak surface even if this use-case's
// caller (the Client-facing controller route) were ever wired incorrectly.
@Injectable()
export class GetMyActiveNutritionPlanUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
  ) {}

  execute(input: { clientId: string }): Promise<NutritionPlan | null> {
    return this.nutrition.findActiveForClient(input.clientId);
  }
}
