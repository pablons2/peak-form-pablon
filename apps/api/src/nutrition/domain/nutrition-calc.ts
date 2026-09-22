import type { BiologicalSex } from "@prisma/client";

// PRD 08 §5.1 — Mifflin-St Jeor BMR. Age is deliberately computed relative
// to *now* (the moment the draft is generated), not the BodyAssessment's own
// recordedAt: this is a *current* draft estimate meant to reflect the
// Client's present TDEE, not a historical reconstruction — unlike PRD 04's
// %BF, which is tied to a specific past measurement's own date.
export function computeAgeYearsNow(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      now.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// `BMR = 10×weight(kg) + 6.25×height(cm) − 5×age(years) + s`, `s = +5` for
// MALE, `−161` for FEMALE (PRD 08 §5.1, exact wording).
export function computeBmrMifflinStJeor(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  biologicalSex: BiologicalSex;
}): number {
  const { weightKg, heightCm, ageYears, biologicalSex } = input;
  const s = biologicalSex === "MALE" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + s;
}

// The PRD names the formula but leaves the TDEE activity-multiplier tiers
// unenumerated ("via an activity multiplier"). Using the standard
// Harris-Benedict-family tier set is the least-surprising choice for anyone
// who has used this kind of calculator before, and keeps the mapping
// obvious/auditable rather than inventing a bespoke scale.
export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

// §5.1 — the full draft: BMR → TDEE → a starting-point calorie target
// adjusted for the Client's stated goal, plus a simple, transparent macro
// split (protein/carbs/fat in grams). This is presented as an *editable
// draft*, never an auto-applied prescription (§3) — the Nutritionist can
// change every one of these numbers before confirming.
export type NutritionGoal =
  | "WEIGHT_LOSS"
  | "MUSCLE_GAIN"
  | "RECOMPOSITION"
  | "MAINTENANCE";

const GOAL_CALORIE_ADJUSTMENT: Record<NutritionGoal, number> = {
  WEIGHT_LOSS: -500,
  MUSCLE_GAIN: 300,
  RECOMPOSITION: -200,
  MAINTENANCE: 0,
};

export interface DraftMacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export function computeDraftCalorieTarget(
  tdee: number,
  goal: NutritionGoal,
): number {
  return Math.round(tdee + GOAL_CALORIE_ADJUSTMENT[goal]);
}

// A simple, transparent starting macro split (grams) — 30% protein / 40%
// carbs / 30% fat of the calorie target, converted via the standard 4/4/9
// kcal-per-gram constants. This is a starting point the Nutritionist edits,
// not a clinical prescription — deliberately unsophisticated.
export function computeDraftMacroTargets(calorieTarget: number): DraftMacroTargets {
  return {
    protein: Math.round((calorieTarget * 0.3) / 4),
    carbs: Math.round((calorieTarget * 0.4) / 4),
    fat: Math.round((calorieTarget * 0.3) / 9),
  };
}
