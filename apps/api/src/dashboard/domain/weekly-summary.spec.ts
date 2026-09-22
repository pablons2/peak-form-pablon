import {
  computeTrainingAdherence,
  computeVolumeTrend,
  computeWeekStrip,
  computeWeightTrend,
  lastSevenDays,
  nearestCheckIn,
} from "./weekly-summary";

describe("lastSevenDays", () => {
  it("returns today-6..today ascending", () => {
    expect(lastSevenDays("2026-09-22")).toEqual([
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
    ]);
  });
});

describe("computeWeekStrip", () => {
  it("fills days with no session as REST", () => {
    const strip = computeWeekStrip(
      [{ date: "2026-09-20", status: "COMPLETED", tonnage: 100 }],
      ["2026-09-19", "2026-09-20", "2026-09-21"],
    );
    expect(strip).toEqual([
      { date: "2026-09-19", status: "REST" },
      { date: "2026-09-20", status: "COMPLETED" },
      { date: "2026-09-21", status: "REST" },
    ]);
  });
});

describe("computeTrainingAdherence", () => {
  it("excludes CANCELLED from the denominator", () => {
    const result = computeTrainingAdherence([
      { date: "d1", status: "COMPLETED", tonnage: 0 },
      { date: "d2", status: "MISSED", tonnage: 0 },
      { date: "d3", status: "CANCELLED", tonnage: 0 },
    ]);
    expect(result).toEqual({ completed: 1, scheduledTotal: 2, percent: 50 });
  });

  it("returns a null percent with no non-cancelled sessions", () => {
    expect(computeTrainingAdherence([])).toEqual({
      completed: 0,
      scheduledTotal: 0,
      percent: null,
    });
  });
});

describe("computeVolumeTrend", () => {
  it("computes a positive delta vs. the prior week", () => {
    const result = computeVolumeTrend(
      [{ date: "d1", status: "COMPLETED", tonnage: 1200 }],
      [{ date: "d0", status: "COMPLETED", tonnage: 1000 }],
    );
    expect(result).toEqual({
      thisWeekTonnage: 1200,
      priorWeekTonnage: 1000,
      deltaPercent: 20,
    });
  });

  it("returns a null delta with no prior-week baseline", () => {
    const result = computeVolumeTrend(
      [{ date: "d1", status: "COMPLETED", tonnage: 500 }],
      [],
    );
    expect(result.deltaPercent).toBeNull();
  });
});

describe("computeWeightTrend", () => {
  it("compares the latest entry to the closest one before this week", () => {
    const result = computeWeightTrend(
      [
        { recordedAt: "2026-09-22T08:00:00.000Z", weight: 79.5 },
        { recordedAt: "2026-09-10T08:00:00.000Z", weight: 81 },
      ],
      "2026-09-16",
    );
    expect(result).toEqual({ latest: 79.5, previous: 81, deltaKg: -1.5 });
  });

  it("returns null previous/delta with under a week of history", () => {
    const result = computeWeightTrend(
      [{ recordedAt: "2026-09-22T08:00:00.000Z", weight: 79.5 }],
      "2026-09-16",
    );
    expect(result).toEqual({ latest: 79.5, previous: null, deltaKg: null });
  });

  it("returns all-null with no assessments at all", () => {
    expect(computeWeightTrend([], "2026-09-16")).toEqual({
      latest: null,
      previous: null,
      deltaKg: null,
    });
  });
});

describe("nearestCheckIn", () => {
  it("picks the earliest ACTIVE nextDueAt across multiple schedules", () => {
    const result = nearestCheckIn([
      { status: "ACTIVE", nextDueAt: "2026-09-30T00:00:00.000Z" },
      { status: "ACTIVE", nextDueAt: "2026-09-24T00:00:00.000Z" },
      { status: "CANCELLED", nextDueAt: "2026-09-20T00:00:00.000Z" },
    ]);
    expect(result).toBe("2026-09-24T00:00:00.000Z");
  });

  it("returns null with no ACTIVE schedules", () => {
    expect(nearestCheckIn([{ status: "FIRED", nextDueAt: null }])).toBeNull();
  });
});
