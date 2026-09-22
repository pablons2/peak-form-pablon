import type {
  FoodDiaryEntry,
  FoodItemCache,
  HydrationLog,
  NutritionPlan,
} from "@prisma/client";

export function toPublicNutritionPlan(plan: NutritionPlan) {
  return {
    id: plan.id,
    clientId: plan.clientId,
    nutritionistId: plan.nutritionistId,
    calorieTarget: plan.calorieTarget,
    macroTargets: plan.macroTargets as unknown as {
      protein: number;
      carbs: number;
      fat: number;
    },
    status: plan.status,
    confirmedByProfessionalAt: plan.confirmedByProfessionalAt,
    mealPlan: plan.mealPlan,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export function toPublicFoodItemCache(item: FoodItemCache) {
  return {
    id: item.id,
    source: item.source,
    externalId: item.externalId,
    name: item.name,
    nutrients: item.nutrients as unknown as {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
  };
}

export function toPublicFoodDiaryEntry(entry: FoodDiaryEntry) {
  return {
    id: entry.id,
    clientId: entry.clientId,
    foodItemCacheId: entry.foodItemCacheId,
    customFoodName: entry.customFoodName,
    quantity: entry.quantity,
    mealSlot: entry.mealSlot,
    loggedAt: entry.loggedAt,
    nutrientsSnapshot: entry.nutrientsSnapshot as unknown as {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    },
  };
}

export function toPublicHydrationLog(log: HydrationLog | null, date: string) {
  return { date, amount: log?.amount ?? 0 };
}
