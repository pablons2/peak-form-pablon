import type { BiologicalSex } from "@prisma/client";

// PRD 04 §5.6 — every professional_validated row currently uses this single
// confirmed protocol; a future protocol addition is a new version constant,
// never a mutation of what this one means (§5.6/§8).
export const POLLOCK7_PROTOCOL_VERSION = "pollock7-v1";

// The Pollock 7-site vocabulary (PRD 04 §5.2) — used to sum the skinfolds
// input into the single `sum7` the Jackson & Pollock formula needs, and
// shared by the domain unit tests below.
export const POLLOCK7_SKINFOLD_SITES = [
  "chest",
  "midaxillary",
  "triceps",
  "subscapular",
  "abdominal",
  "suprailiac",
  "thigh",
] as const;
export type Pollock7Skinfolds = Record<
  (typeof POLLOCK7_SKINFOLD_SITES)[number],
  number
>;

export function sumSkinfoldsMm(skinfolds: Pollock7Skinfolds): number {
  return POLLOCK7_SKINFOLD_SITES.reduce(
    (sum, site) => sum + skinfolds[site],
    0,
  );
}

// Age in whole years at `at`, from a date of birth — never stored (PRD 04
// §5.2: "age is computed at calculation time ... never stored as a
// standalone age field"). UTC-based to match this codebase's other
// date-math (mesocycle-scheduling.ts) and avoid DST/timezone drift.
export function computeAgeYears(dateOfBirth: Date, at: Date): number {
  let age = at.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    at.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (at.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      at.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// Jackson & Pollock (1978) generalized 7-site skinfold equation (PRD 04
// §5.2) — sex-specific body density from the sum of the 7 skinfolds (mm)
// and age (years).
export function computeBodyDensityJacksonPollock7(input: {
  sum7Mm: number;
  ageYears: number;
  biologicalSex: BiologicalSex;
}): number {
  const { sum7Mm, ageYears, biologicalSex } = input;
  if (biologicalSex === "MALE") {
    return (
      1.112 -
      0.00043499 * sum7Mm +
      0.00000055 * sum7Mm ** 2 -
      0.00028826 * ageYears
    );
  }
  return (
    1.097 -
    0.00046971 * sum7Mm +
    0.00000056 * sum7Mm ** 2 -
    0.00012828 * ageYears
  );
}

// Siri (1961) equation (PRD 04 §5.2) — body density to % body fat. Rounded
// to one decimal per §5.3's precision note ("the UI should not imply more
// precision than the method supports").
export function computeBodyFatPercentSiri(bodyDensity: number): number {
  const percent = 495 / bodyDensity - 450;
  return Math.round(percent * 10) / 10;
}

// BMI (PRD 04 §5.2) — weight in kg, height in cm. Rounded to one decimal for
// the same "don't overstate precision" reason as %BF.
export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / heightM ** 2) * 10) / 10;
}

// Waist-to-hip ratio (PRD 04 §5.2), both in cm. Rounded to two decimals —
// the conventional precision for WHR (e.g. "0.85"), one more digit than
// %BF/BMI since the ratio itself is typically quoted that way clinically.
export function computeWaistHipRatio(waistCm: number, hipCm: number): number {
  return Math.round((waistCm / hipCm) * 100) / 100;
}
