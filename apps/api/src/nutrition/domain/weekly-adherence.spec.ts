import {
  computeWeeklyAdherenceSummary,
  type DayLog,
  type WeeklyTarget,
} from "./weekly-adherence";

const target: WeeklyTarget = {
  calorieTarget: 2000,
  macroTargets: { protein: 150, carbs: 200, fat: 65 },
};

describe("computeWeeklyAdherenceSummary (PRD 08 §5.6)", () => {
  it("returns zero days/adherence when nothing was logged", () => {
    expect(computeWeeklyAdherenceSummary([], target)).toEqual({
      daysLogged: 0,
      averageAdherencePercent: 0,
    });
  });

  it("excludes all-zero days from the days-logged count", () => {
    const days: DayLog[] = [
      { date: "2026-03-01", calories: 0, protein: 0, carbs: 0, fat: 0 },
    ];
    expect(computeWeeklyAdherenceSummary(days, target).daysLogged).toBe(0);
  });

  it("treats an exact match to target as 100% adherence", () => {
    const days: DayLog[] = [
      { date: "2026-03-01", calories: 2000, protein: 150, carbs: 200, fat: 65 },
    ];
    expect(computeWeeklyAdherenceSummary(days, target)).toEqual({
      daysLogged: 1,
      averageAdherencePercent: 100,
    });
  });

  it("averages per-day deviation across multiple logged days", () => {
    // Day 1: exact match -> 100% adherence.
    // Day 2: calories +10%, protein -20%, carbs 0%, fat 0% -> avg deviation
    // 7.5% -> 92.5% adherence.
    // Average of [100, 92.5] = 96.25 -> rounds to 96.3.
    const days: DayLog[] = [
      { date: "2026-03-01", calories: 2000, protein: 150, carbs: 200, fat: 65 },
      { date: "2026-03-02", calories: 2200, protein: 120, carbs: 200, fat: 65 },
    ];
    expect(computeWeeklyAdherenceSummary(days, target)).toEqual({
      daysLogged: 2,
      averageAdherencePercent: 96.3,
    });
  });

  it("clamps adherence at 0 instead of going negative for wild deviations", () => {
    const days: DayLog[] = [
      { date: "2026-03-01", calories: 20000, protein: 0, carbs: 0, fat: 0 },
    ];
    expect(
      computeWeeklyAdherenceSummary(days, target).averageAdherencePercent,
    ).toBe(0);
  });

  it("returns zero adherence (but a nonzero days-logged count) with no active target", () => {
    const days: DayLog[] = [
      { date: "2026-03-01", calories: 1800, protein: 140, carbs: 180, fat: 60 },
    ];
    expect(computeWeeklyAdherenceSummary(days, null)).toEqual({
      daysLogged: 1,
      averageAdherencePercent: 0,
    });
  });
});
