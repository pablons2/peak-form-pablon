import {
  computeAgeYearsNow,
  computeBmrMifflinStJeor,
  computeDraftCalorieTarget,
  computeDraftMacroTargets,
  computeTdee,
} from "./nutrition-calc";

describe("nutrition-calc (PRD 08 §5.1)", () => {
  it("computes age relative to now, not a historical date", () => {
    expect(
      computeAgeYearsNow(new Date("1996-03-01"), new Date("2026-03-01")),
    ).toBe(30);
    // Birthday not yet reached this year.
    expect(
      computeAgeYearsNow(new Date("1996-06-15"), new Date("2026-03-01")),
    ).toBe(29);
  });

  it("computes BMR via Mifflin-St Jeor for a MALE Client (s = +5)", () => {
    // BMR = 10*70 + 6.25*175 - 5*30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
    const bmr = computeBmrMifflinStJeor({
      weightKg: 70,
      heightCm: 175,
      ageYears: 30,
      biologicalSex: "MALE",
    });
    expect(bmr).toBeCloseTo(1648.75, 5);
  });

  it("computes BMR via Mifflin-St Jeor for a FEMALE Client (s = -161)", () => {
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    const bmr = computeBmrMifflinStJeor({
      weightKg: 60,
      heightCm: 165,
      ageYears: 25,
      biologicalSex: "FEMALE",
    });
    expect(bmr).toBeCloseTo(1345.25, 5);
  });

  it("applies the activity multiplier to derive TDEE", () => {
    // 1648.75 * 1.55 = 2555.5625 -> rounds to 2556
    expect(computeTdee(1648.75, "MODERATE")).toBe(2556);
    // 1345.25 * 1.2 = 1614.3 -> rounds to 1614
    expect(computeTdee(1345.25, "SEDENTARY")).toBe(1614);
  });

  it("adjusts TDEE by the stated goal to get a draft calorie target", () => {
    expect(computeDraftCalorieTarget(2556, "WEIGHT_LOSS")).toBe(2056);
    expect(computeDraftCalorieTarget(2556, "MUSCLE_GAIN")).toBe(2856);
    expect(computeDraftCalorieTarget(2556, "RECOMPOSITION")).toBe(2356);
    expect(computeDraftCalorieTarget(2556, "MAINTENANCE")).toBe(2556);
  });

  it("splits the calorie target into a 30/40/30 macro gram split", () => {
    // protein = round(2056*0.3/4) = round(154.2) = 154
    // carbs   = round(2056*0.4/4) = round(205.6) = 206
    // fat     = round(2056*0.3/9) = round(68.5333) = 69
    expect(computeDraftMacroTargets(2056)).toEqual({
      protein: 154,
      carbs: 206,
      fat: 69,
    });
  });
});
