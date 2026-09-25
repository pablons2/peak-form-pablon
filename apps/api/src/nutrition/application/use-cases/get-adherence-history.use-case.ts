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

// PRD 08 §5.6 — the acompanhamento panel's 4-week adherence trend: the same
// per-day adherence computation as the weekly summary, bucketed into the
// last four 7-day windows (oldest first). One fetch + one bucketing pass —
// no per-week queries.
export interface WeeklyAdherencePoint extends WeeklyAdherenceSummary {
  /// "YYYY-MM-DD" — the window's start (7 days before its end).
  weekStart: string;
}

@Injectable()
export class GetAdherenceHistoryUseCase {
  constructor(
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
    private readonly access: NutritionAccess,
  ) {}

  async execute(input: {
    viewer: { id: string; role: Role };
    clientId: string;
    now: Date;
  }): Promise<{ weeks: WeeklyAdherencePoint[] }> {
    if (input.viewer.role !== Role.CLIENT || input.viewer.id !== input.clientId) {
      await this.access.assertCanManagePlanFor(input.viewer, input.clientId);
    }

    const since = new Date(input.now.getTime() - 28 * 24 * 60 * 60 * 1000);
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

    const target = activeTarget
      ? {
          calorieTarget: activeTarget.calorieTarget,
          macroTargets: activeTarget.macroTargets as unknown as {
            protein: number;
            carbs: number;
            fat: number;
          },
        }
      : null;

    // Oldest window first so the panel renders a left-to-right trend.
    const weeks: WeeklyAdherencePoint[] = [];
    for (let i = 3; i >= 0; i--) {
      const windowEnd = new Date(input.now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const days = [...byDay.values()].filter((d) => {
        const t = new Date(`${d.date}T00:00:00.000Z`).getTime();
        return t > windowStart.getTime() && t <= windowEnd.getTime();
      });
      const summary = computeWeeklyAdherenceSummary(days, target);
      weeks.push({ ...summary, weekStart: windowStart.toISOString().slice(0, 10) });
    }

    return { weeks };
  }
}
