import { Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  computeWeeklyAdherenceSummary,
  type DayLog,
  type WeeklyAdherenceSummary,
} from "../../domain/weekly-adherence";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../../domain/ports/nutrition.repository.port";
import { NutritionAccess } from "../nutrition-access.service";

// PRD 08 §5.6/§10 — days-logged + average macro adherence % over the past 7
// days. Both the Client's own endpoint and the Professional's endpoint call
// this exact same use-case for the same clientId, so the numbers are
// structurally identical (§10 AC "parity Client/Nutritionist") rather than
// two independently-computed views that could drift.
@Injectable()
export class GetWeeklyAdherenceSummaryUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    viewer: { id: string; role: Role };
    clientId: string;
    now: Date;
  }): Promise<WeeklyAdherenceSummary> {
    if (input.viewer.role !== Role.CLIENT || input.viewer.id !== input.clientId) {
      await this.access.assertCanManagePlanFor(input.viewer, input.clientId);
    }

    const since = new Date(input.now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [entries, activeTarget] = await Promise.all([
      this.nutrition.listFoodDiaryEntriesForClientSince(input.clientId, since),
      this.nutrition.findActiveForClient(input.clientId),
    ]);

    const byDay = new Map<string, DayLog>();
    for (const entry of entries) {
      const date = entry.loggedAt.toISOString().slice(0, 10);
      const n = entry.nutrientsSnapshot as unknown as {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      const existing = byDay.get(date) ?? {
        date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      existing.calories += n.calories;
      existing.protein += n.protein;
      existing.carbs += n.carbs;
      existing.fat += n.fat;
      byDay.set(date, existing);
    }

    return computeWeeklyAdherenceSummary(
      [...byDay.values()],
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
    );
  }
}
