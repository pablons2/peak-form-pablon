import { Inject, Injectable } from "@nestjs/common";
import { Role, type FoodDiaryEntry, type NutritionPlan } from "@prisma/client";
import { computeNudges, type Nudge } from "../../domain/nudge-rules";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

export interface DailyFoodDiaryResult {
  entries: FoodDiaryEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  activeTarget: NutritionPlan | null;
  nudges: Nudge[];
}

// PRD 08 §5.3/§5.5 — the day's logged entries, running macro totals vs. the
// Client's active target (read-side aggregation, not a stored running
// total — computed fresh from the day's entries every call so it can never
// drift from what's actually logged), and the non-clinical nudges. Used by
// both the Client's own view (self) and the Professional's read-only view
// (own linked Client, NUTRITIONIST specialization).
@Injectable()
export class GetDailyFoodDiaryUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    viewer: { id: string; role: Role };
    clientId: string;
    date: string;
    nowHour: number;
  }): Promise<DailyFoodDiaryResult> {
    if (input.viewer.role !== Role.CLIENT || input.viewer.id !== input.clientId) {
      await this.access.assertCanManagePlanFor(input.viewer, input.clientId);
    }

    const [entries, activeTarget] = await Promise.all([
      this.nutrition.listFoodDiaryEntriesForClientOnDate(input.clientId, input.date),
      this.nutrition.findActiveForClient(input.clientId),
    ]);

    const totals = entries.reduce(
      (acc, e) => {
        const n = e.nutrientsSnapshot as unknown as {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        acc.calories += n.calories;
        acc.protein += n.protein;
        acc.carbs += n.carbs;
        acc.fat += n.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const loggedMealSlots = [
      ...new Set(entries.map((e) => e.mealSlot)),
    ] as Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">;

    const nudges = computeNudges(
      { ...totals, loggedMealSlots },
      activeTarget
        ? {
            calorieTarget: activeTarget.calorieTarget,
            macroTargets: activeTarget.macroTargets as unknown as {
              protein: number;
              carbs: number;
              fat: number;
            },
          }
        : null,
      input.nowHour,
    );

    return { entries, totals, activeTarget, nudges };
  }
}
