import { computeNudges, type DailyTarget, type DailyTotals } from "./nudge-rules";

const target: DailyTarget = {
  calorieTarget: 2000,
  macroTargets: { protein: 150, carbs: 200, fat: 65 },
};

describe("computeNudges (PRD 08 §5.5)", () => {
  it("returns no nudges when there is no active target", () => {
    const totals: DailyTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      loggedMealSlots: [],
    };
    expect(computeNudges(totals, null, 12)).toEqual([]);
  });

  it("flags low protein below 70% of target", () => {
    const totals: DailyTotals = {
      calories: 1500,
      protein: 100, // 100/150 = 66.7% < 70%
      carbs: 150,
      fat: 50,
      loggedMealSlots: ["BREAKFAST"],
    };
    const nudges = computeNudges(totals, target, 10);
    expect(nudges.map((n) => n.code)).toContain("LOW_PROTEIN");
  });

  it("does not flag protein at exactly the target", () => {
    const totals: DailyTotals = {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
      loggedMealSlots: ["BREAKFAST", "LUNCH", "DINNER"],
    };
    const nudges = computeNudges(totals, target, 10);
    expect(nudges.map((n) => n.code)).not.toContain("LOW_PROTEIN");
  });

  it("flags calories above 110% of target", () => {
    const totals: DailyTotals = {
      calories: 2300, // 2300/2000 = 115%
      protein: 150,
      carbs: 200,
      fat: 65,
      loggedMealSlots: ["BREAKFAST", "LUNCH", "DINNER"],
    };
    const nudges = computeNudges(totals, target, 22);
    expect(nudges.map((n) => n.code)).toContain("OVER_CALORIE_TARGET");
  });

  it("flags lunch not logged only from 14:00 onward", () => {
    const totals: DailyTotals = {
      calories: 400,
      protein: 20,
      carbs: 40,
      fat: 10,
      loggedMealSlots: ["BREAKFAST"],
    };
    expect(computeNudges(totals, target, 11).map((n) => n.code)).not.toContain(
      "MEAL_NOT_LOGGED_LUNCH",
    );
    expect(computeNudges(totals, target, 15).map((n) => n.code)).toContain(
      "MEAL_NOT_LOGGED_LUNCH",
    );
  });

  it("flags dinner not logged only from 21:00 onward, independent of lunch", () => {
    const totals: DailyTotals = {
      calories: 1200,
      protein: 90,
      carbs: 120,
      fat: 40,
      loggedMealSlots: ["BREAKFAST", "LUNCH"],
    };
    expect(computeNudges(totals, target, 20).map((n) => n.code)).not.toContain(
      "MEAL_NOT_LOGGED_DINNER",
    );
    expect(computeNudges(totals, target, 21).map((n) => n.code)).toContain(
      "MEAL_NOT_LOGGED_DINNER",
    );
  });
});
