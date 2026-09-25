import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { MealSlot, type FoodDiaryEntry } from "@prisma/client";
import type { LogFoodDiaryEntryInput } from "@peakform/validation";
import { scaleNutrients } from "../../domain/nutrition-calc";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";

// PRD 08 §5.3 — the Client's own food diary write. clientId always comes
// from the JWT (never trusted from the body — the controller passes it in
// separately from `data`, base doc §9). Exactly one of two paths resolves
// the per-100g nutrients used for the snapshot: a cached food (looked up
// fresh here, not trusted from the client) or the manual-entry fallback
// (§7 — Open Food Facts "not found"). The resulting snapshot is computed
// once, here, and stored inline — see the FoodDiaryEntry model comment for
// why this is never a live join back to the cache.
@Injectable()
export class LogFoodDiaryEntryUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
  ) {}

  async execute(input: {
    clientId: string;
    data: LogFoodDiaryEntryInput;
  }): Promise<FoodDiaryEntry> {
    const { data } = input;

    let nutrientsPer100g: { calories: number; protein: number; carbs: number; fat: number };
    let foodItemCacheId: string | null = null;
    let customFoodName: string | null = null;

    if (data.foodItemCacheId) {
      const cached = await this.nutrition.findFoodItemCacheById(data.foodItemCacheId);
      if (!cached) throw new NotFoundException("Food item not found");
      foodItemCacheId = cached.id;
      nutrientsPer100g = cached.nutrients as unknown as {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    } else if (data.customFoodName && data.customNutrients) {
      customFoodName = data.customFoodName;
      nutrientsPer100g = data.customNutrients;
    } else {
      throw new BadRequestException("Invalid food diary entry payload");
    }

    const nutrientsSnapshot = scaleNutrients(nutrientsPer100g, data.quantity);

    return this.nutrition.createFoodDiaryEntry({
      clientId: input.clientId,
      foodItemCacheId,
      customFoodName,
      quantity: data.quantity,
      mealSlot: MealSlot[data.mealSlot],
      nutrientsSnapshot,
    });
  }
}

