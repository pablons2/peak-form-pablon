// PRD 08 §5.5 — automated, rule-based, non-clinical nudges only. Every rule
// here is a deterministic threshold check over the day's logged totals vs.
// the active target — no freeform text generation, no LLM call, nothing
// that could read as medical/nutritional advice (§5.5/§9's own caution
// about drifting into clinical-advice territory). Keep this rule set small.
export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedMealSlots: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">;
}

export interface DailyTarget {
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fat: number };
}

export type NudgeCode =
  | "LOW_PROTEIN"
  | "OVER_CALORIE_TARGET"
  | "MEAL_NOT_LOGGED_LUNCH"
  | "MEAL_NOT_LOGGED_DINNER";

export interface Nudge {
  code: NudgeCode;
  message: string;
}

const LOW_PROTEIN_THRESHOLD = 0.7; // below 70% of target protein
const OVER_CALORIE_THRESHOLD = 1.1; // above 110% of target calories

// `nowHour` (0-23, local-to-the-Client-but-caller-supplied) gates the
// "haven't logged X yet" rules so they don't fire at 9am before lunch is
// even expected — the caller (the use-case, which knows the request time)
// passes it in rather than this pure function reaching for a clock itself.
export function computeNudges(
  totals: DailyTotals,
  target: DailyTarget | null,
  nowHour: number,
): Nudge[] {
  if (!target) return [];

  const nudges: Nudge[] = [];

  if (totals.protein < target.macroTargets.protein * LOW_PROTEIN_THRESHOLD) {
    nudges.push({
      code: "LOW_PROTEIN",
      message: "Você está abaixo da meta de proteína hoje.",
    });
  }

  if (totals.calories > target.calorieTarget * OVER_CALORIE_THRESHOLD) {
    nudges.push({
      code: "OVER_CALORIE_TARGET",
      message: "Você já passou da meta de calorias hoje.",
    });
  }

  if (nowHour >= 14 && !totals.loggedMealSlots.includes("LUNCH")) {
    nudges.push({
      code: "MEAL_NOT_LOGGED_LUNCH",
      message: "Você ainda não registrou o almoço de hoje.",
    });
  }

  if (nowHour >= 21 && !totals.loggedMealSlots.includes("DINNER")) {
    nudges.push({
      code: "MEAL_NOT_LOGGED_DINNER",
      message: "Você ainda não registrou o jantar de hoje.",
    });
  }

  return nudges;
}
