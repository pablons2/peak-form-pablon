import { Inject, Injectable } from "@nestjs/common";
import type { HydrationLog } from "@prisma/client";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";

@Injectable()
export class GetHydrationUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
  ) {}

  execute(input: { clientId: string; date: string }): Promise<HydrationLog | null> {
    return this.nutrition.getHydration(input.clientId, input.date);
  }
}
