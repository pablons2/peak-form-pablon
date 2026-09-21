import { Weekday } from "@prisma/client";
import {
  candidateSessionSlots,
  computeMesocycleStartDate,
  sumWeeksBeforeOrder,
} from "./mesocycle-scheduling";

describe("sumWeeksBeforeOrder", () => {
  it("sums only mesocycles with a strictly lower order", () => {
    const mesocycles = [
      { order: 1, weeks: 4 },
      { order: 2, weeks: 6 },
      { order: 3, weeks: 2 },
    ];
    expect(sumWeeksBeforeOrder(mesocycles, 1)).toBe(0);
    expect(sumWeeksBeforeOrder(mesocycles, 2)).toBe(4);
    expect(sumWeeksBeforeOrder(mesocycles, 3)).toBe(10);
  });
});

describe("computeMesocycleStartDate", () => {
  it("adds priorWeeks*7 days in UTC", () => {
    const planStart = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05 (Monday)
    expect(computeMesocycleStartDate(planStart, 0).toISOString()).toBe(
      new Date(Date.UTC(2026, 0, 5)).toISOString(),
    );
    expect(computeMesocycleStartDate(planStart, 4).toISOString()).toBe(
      new Date(Date.UTC(2026, 0, 33)).toISOString(), // rolls into February
    );
  });
});

describe("candidateSessionSlots", () => {
  it("returns every date in range matching a template weekday, paired with the weekday", () => {
    const start = new Date(Date.UTC(2026, 0, 5)); // Monday 2026-01-05
    const slots = candidateSessionSlots(start, 2, [Weekday.MONDAY, Weekday.WEDNESDAY]);
    expect(
      slots.map((s) => [s.date.toISOString().slice(0, 10), s.weekday]),
    ).toEqual([
      ["2026-01-05", Weekday.MONDAY],
      ["2026-01-07", Weekday.WEDNESDAY],
      ["2026-01-12", Weekday.MONDAY],
      ["2026-01-14", Weekday.WEDNESDAY],
    ]);
  });

  it("returns an empty array when no weekday matches", () => {
    const start = new Date(Date.UTC(2026, 0, 5));
    expect(candidateSessionSlots(start, 1, [])).toEqual([]);
  });

  it("handles a mesocycle start date that isn't the first day of a week", () => {
    const start = new Date(Date.UTC(2026, 0, 7)); // Wednesday
    const slots = candidateSessionSlots(start, 1, [Weekday.MONDAY]);
    // The following Monday, 5 days later, is still within the 7-day span.
    expect(slots.map((s) => s.date.toISOString().slice(0, 10))).toEqual(["2026-01-12"]);
  });
});
