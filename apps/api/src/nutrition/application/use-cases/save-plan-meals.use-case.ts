import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Role, type NutritionPlan } from "@prisma/client";
import type { SavePlanMealsInput } from "@peakform/validation";
import { scaleNutrients } from "../../domain/nutrition-calc";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

// PRD 08 §5.2 — the meal-plan builder's save. The Nutritionist composes
// meals from cached foods (TACO/Open Food Facts/USDA) or manual entries;
// this use-case resolves every foodItemCacheId fresh, scales the per-100g
// nutrients by the planned grams, and stores per-item snapshots plus
// per-slot/day totals inline — the same compute-server-side, snapshot-once
// pattern as the food diary (never trusting caller-computed numbers, and
// never a live join back to the cache at read time). Deliberately cannot
// change status or targets: only `confirm` moves a plan to ACTIVE (§3).
@Injectable()
export class SavePlanMealsUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    planId: string;
    data: SavePlanMealsInput;
  }): Promise<NutritionPlan> {
    const plan = await this.nutrition.findById(input.planId);
    if (!plan) throw new NotFoundException("Nutrition plan not found");

    await this.access.assertCanManagePlanFor(input.actor, plan.clientId);

    if (plan.status === "ARCHIVED") {
      throw new BadRequestException("Cannot edit an archived nutrition plan");
    }

    const slots = [];
    const dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const slot of input.data.slots) {
      const items = [];
      const slotTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      for (const item of slot.items) {
        let name: string;
        let per100g: { calories: number; protein: number; carbs: number; fat: number };
        let foodItemCacheId: string | null = null;

        if (item.foodItemCacheId) {
          const cached = await this.nutrition.findFoodItemCacheById(item.foodItemCacheId);
          if (!cached) throw new NotFoundException("Food item not found");
          foodItemCacheId = cached.id;
          name = cached.name;
          per100g = cached.nutrients as unknown as {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          };
        } else {
          name = item.customFoodName!;
          per100g = item.customNutrients!;
        }

        items.push({
          foodItemCacheId,
          customFoodName: foodItemCacheId ? null : name,
          name,
          quantityGrams: item.quantityGrams,
          nutrients: scaleNutrients(per100g, item.quantityGrams),
        });
      }

      for (const item of items) {
        slotTotals.calories += item.nutrients.calories;
        slotTotals.protein += item.nutrients.protein;
        slotTotals.carbs += item.nutrients.carbs;
        slotTotals.fat += item.nutrients.fat;
      }
      slotTotals.calories = Math.round(slotTotals.calories);
      slotTotals.protein = Math.round(slotTotals.protein * 10) / 10;
      slotTotals.carbs = Math.round(slotTotals.carbs * 10) / 10;
      slotTotals.fat = Math.round(slotTotals.fat * 10) / 10;

      dayTotals.calories += slotTotals.calories;
      dayTotals.protein += slotTotals.protein;
      dayTotals.carbs += slotTotals.carbs;
      dayTotals.fat += slotTotals.fat;

      slots.push({ mealSlot: slot.mealSlot, items, totals: slotTotals });
    }

    dayTotals.calories = Math.round(dayTotals.calories);
    dayTotals.protein = Math.round(dayTotals.protein * 10) / 10;
    dayTotals.carbs = Math.round(dayTotals.carbs * 10) / 10;
    dayTotals.fat = Math.round(dayTotals.fat * 10) / 10;

    return this.nutrition.updateMeals(input.planId, { slots, dayTotals });
  }
}
