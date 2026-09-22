// PRD 08 §5.6 — days-logged count + average macro adherence % over the past
// 7 days. Pure function over already-fetched per-day totals so both the
// Client's and the Nutritionist's endpoints can call the exact same
// computation and get identical numbers (§10 AC "parity Client/Nutritionist"
// — a shared function is what makes drift structurally impossible, not just
// unlikely).
export interface DayLog {
  date: string; // "YYYY-MM-DD"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeeklyTarget {
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fat: number };
}

export interface WeeklyAdherenceSummary {
  daysLogged: number;
  averageAdherencePercent: number; // 0-100, rounded to 1 decimal
}

// Per-day adherence is 100% minus the average absolute % deviation across
// calories/protein/carbs/fat vs. target, clamped to [0, 100] — a day with no
// target set (Client not yet ACTIVE) or zero logged totals doesn't count
// toward "days logged".
export function computeWeeklyAdherenceSummary(
  days: DayLog[],
  target: WeeklyTarget | null,
): WeeklyAdherenceSummary {
  const loggedDays = days.filter(
    (d) => d.calories > 0 || d.protein > 0 || d.carbs > 0 || d.fat > 0,
  );
  if (!target || loggedDays.length === 0) {
    return { daysLogged: loggedDays.length, averageAdherencePercent: 0 };
  }

  const perDayAdherence = loggedDays.map((d) => {
    const deviations = [
      deviationPercent(d.calories, target.calorieTarget),
      deviationPercent(d.protein, target.macroTargets.protein),
      deviationPercent(d.carbs, target.macroTargets.carbs),
      deviationPercent(d.fat, target.macroTargets.fat),
    ];
    const avgDeviation =
      deviations.reduce((a, b) => a + b, 0) / deviations.length;
    return Math.max(0, 100 - avgDeviation);
  });

  const average =
    perDayAdherence.reduce((a, b) => a + b, 0) / perDayAdherence.length;

  return {
    daysLogged: loggedDays.length,
    averageAdherencePercent: Math.round(average * 10) / 10,
  };
}

function deviationPercent(actual: number, target: number): number {
  if (target <= 0) return 0;
  return (Math.abs(actual - target) / target) * 100;
}
