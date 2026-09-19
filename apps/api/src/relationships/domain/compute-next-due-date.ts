import type { CheckInCadence } from "@prisma/client";

const DAY_MS = 86_400_000;

/// PRD 02 §5.6 — date-math lives in the Domain layer as a pure function so
/// it's unit-testable without touching the database. All math is done in UTC
/// at day granularity: `nextDueAt` is always UTC midnight of the anchor day,
/// which is exactly what the firing job compares `now` against.
///
/// Semantics: returns the first occurrence of the anchor STRICTLY AFTER the
/// calendar day of `from`. A weekly schedule anchored on Friday created on a
/// Friday is therefore first due the following Friday; after each firing, the
/// next occurrence is one full cadence later (the fire happens at UTC midnight
/// on the anchor day, so "strictly after" lands on the next anchor day).
export function computeNextDueDate(
  cadence: CheckInCadence,
  anchor: number,
  from: Date,
): Date {
  const fromDay = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );

  if (cadence === "MONTHLY") {
    let year = from.getUTCFullYear();
    let month = from.getUTCMonth();
    for (;;) {
      const candidate = clampedMonthlyDay(year, month, anchor);
      if (candidate > fromDay) {
        return new Date(candidate);
      }
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }

  // WEEKLY / BIWEEKLY — scan forward for the nearest matching weekday
  // (always within 7 days, since every weekday recurs weekly regardless of
  // cadence). For an initial creation (`from` isn't itself the anchor
  // weekday) that nearest match is the right answer for both cadences — the
  // Professional wants the upcoming Friday, not one artificially pushed out.
  // For an advance after firing (`from` IS the anchor weekday at UTC
  // midnight — see the firing job), WEEKLY returns that nearest match as-is
  // (+7), but BIWEEKLY must skip it and add one more week (+14) to keep a
  // genuine 14-day cadence instead of collapsing to weekly.
  let match: Date | null = null;
  for (let add = 1; add <= 7; add++) {
    const candidate = new Date(fromDay + add * DAY_MS);
    if (candidate.getUTCDay() === anchor) {
      match = candidate;
      break;
    }
  }
  if (!match) throw new Error(`Invalid anchor ${anchor} for cadence ${cadence}`);

  const firingOnAnchorDay = new Date(fromDay).getUTCDay() === anchor;
  if (cadence === "BIWEEKLY" && firingOnAnchorDay) {
    return new Date(match.getTime() + 7 * DAY_MS);
  }
  return match;
}

// Returns the UTC-midnight timestamp of the clamped anchor day within
// (year, month) — NOT just the day-of-month number, which the caller
// compares directly against `fromDay` (itself a timestamp).
function clampedMonthlyDay(
  year: number,
  month: number,
  anchor: number,
): number {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(anchor, lastDay);
  return Date.UTC(year, month, day);
}
