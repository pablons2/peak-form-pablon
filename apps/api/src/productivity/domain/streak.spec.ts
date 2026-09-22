import type { Weekday } from "@prisma/client";
import { computeStreak } from "./streak";

// PRD 10 §5.2/§10 — hand-computed expectations for the streak walk. Dates
// are all UTC "yyyy-mm-dd"; 2024-01-10 is a Wednesday (2024-01-01 is a
// Monday), used below for the SPECIFIC_WEEKDAYS case.
describe("computeStreak", () => {
  it("returns 0 for a habit with no check-in history at all", () => {
    expect(computeStreak([], [], "2024-01-10", "2024-01-01")).toBe(0);
  });

  it("counts consecutive daily check-ins ending today", () => {
    const checked = ["2024-01-08", "2024-01-09", "2024-01-10"];
    expect(computeStreak(checked, [], "2024-01-10", "2024-01-01")).toBe(3);
  });

  it("a missed day breaks the walk and the streak resets", () => {
    // Checked today and 3 days ago, but not yesterday or the day before —
    // the walk stops the moment it hits the first unchecked *past* due day.
    const checked = ["2024-01-07", "2024-01-10"];
    expect(computeStreak(checked, [], "2024-01-10", "2024-01-01")).toBe(1);
  });

  it("today being unchecked (still pending) does not reset an intact streak", () => {
    const checked = ["2024-01-08", "2024-01-09"];
    expect(computeStreak(checked, [], "2024-01-10", "2024-01-01")).toBe(2);
  });

  it("SPECIFIC_WEEKDAYS cadence skips non-due days without breaking the streak", () => {
    const weekdays: Weekday[] = ["WEDNESDAY"] as Weekday[];
    // Due only on Wednesdays: 2024-01-10 and 2024-01-03, both checked; every
    // day in between is a non-due day and must be skipped, not counted.
    const checked = ["2024-01-03", "2024-01-10"];
    expect(computeStreak(checked, weekdays, "2024-01-10", "2023-12-01")).toBe(2);
  });

  it("never walks further back than the habit's creation date", () => {
    // Created "today" — there is no history before it to have missed, so
    // the streak is exactly today's single check-in, not reset by the
    // (nonexistent) days before creation.
    expect(computeStreak(["2024-01-10"], [], "2024-01-10", "2024-01-10")).toBe(1);
  });
});
