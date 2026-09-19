import { CheckInCadence } from "@prisma/client";
import { computeNextDueDate } from "./compute-next-due-date";

// PRD 02 §5.6 — pure Domain date-math, unit-tested without touching the
// database. All math is UTC at day granularity; nextDueAt is always UTC
// midnight of the anchor day.
describe("computeNextDueDate", () => {
  it("WEEKLY: returns the next occurrence of the anchor weekday", () => {
    // 2026-09-19 is a Saturday; next Friday (anchor 5) is 2026-09-25.
    const next = computeNextDueDate(
      CheckInCadence.WEEKLY,
      5,
      new Date("2026-09-19T10:30:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("advances WEEKLY exactly +7 days when fired on the anchor day", () => {
    const fired = new Date("2026-09-25T00:00:00.000Z"); // a Friday
    const next = computeNextDueDate(CheckInCadence.WEEKLY, 5, fired);
    expect(next.toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });

  it("wraps WEEKLY across the week boundary", () => {
    // Wed 2026-09-23 → next Monday (anchor 1) is 2026-09-28.
    const next = computeNextDueDate(
      CheckInCadence.WEEKLY,
      1,
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });

  it("advances BIWEEKLY by 14 days from the fired anchor day", () => {
    const fired = new Date("2026-09-25T00:00:00.000Z"); // a Friday
    const next = computeNextDueDate(CheckInCadence.BIWEEKLY, 5, fired);
    expect(next.toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });

  it("clamps MONTHLY anchors beyond the month's length (31 → Apr 30)", () => {
    const next = computeNextDueDate(
      CheckInCadence.MONTHLY,
      31,
      new Date("2026-04-01T00:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  it("rolls a MONTHLY anchor to the next month when the day already passed", () => {
    const next = computeNextDueDate(
      CheckInCadence.MONTHLY,
      10,
      new Date("2026-09-19T15:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });
});
