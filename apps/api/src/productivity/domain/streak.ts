import type { Weekday } from "@prisma/client";

// PRD 10 §5.2/§6 — streak math is pure domain logic, deliberately with no
// Prisma/HTTP imports: it operates on plain "yyyy-mm-dd" strings and the
// Weekday enum vocabulary only, so it's trivially unit-testable and stays
// independent of how dates are stored/queried.

// JS Date#getUTCDay() is 0 (Sunday) .. 6 (Saturday); this is the same
// mapping PRD 06's mesocycle scheduling already uses (see
// training-plans/domain/mesocycle-scheduling.ts's WEEKDAY_FROM_JS_INDEX) —
// redefined locally rather than imported, keeping this module's domain
// layer free of any cross-module dependency (§3's isolation requirement).
const WEEKDAY_FROM_JS_INDEX: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as Weekday[];

function isoToUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDaysIso(iso: string, delta: number): string {
  const d = isoToUtcDate(iso);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// An empty `weekdays` array means DAILY cadence — every calendar day is
// due (matches createHabitSchema's `.default([])` and the DAILY vs.
// SPECIFIC_WEEKDAYS split in schema.prisma).
export function isDueOn(weekdays: Weekday[], dateIso: string): boolean {
  if (weekdays.length === 0) return true;
  const weekday = WEEKDAY_FROM_JS_INDEX[isoToUtcDate(dateIso).getUTCDay()]!;
  return weekdays.includes(weekday);
}

// PRD 10 §5.2/§10 — consecutive-day streak, walking backward from `today`.
// Rules:
//   - a due day that was checked increments the streak;
//   - a due day that was NOT checked breaks the walk, UNLESS it's `today`
//     itself (today is still "pending" — it hasn't been missed yet, so it
//     must not reset an otherwise-intact streak);
//   - a non-due day (SPECIFIC_WEEKDAYS cadence, off day) is skipped —
//     neither increments nor breaks the walk;
//   - the walk never goes further back than `createdDate` — a habit can't
//     have "missed" a day before it existed.
// Historical check-ins are never mutated/deleted by this function (§10) —
// it's a pure read-side calculation over whatever check-ins are passed in.
export function computeStreak(
  checkedDates: string[],
  dueWeekdays: Weekday[],
  today: string,
  createdDate: string,
): number {
  const checked = new Set(checkedDates);
  let streak = 0;
  let cursor = today;

  // Plain string comparison is safe here: both operands are fixed-width
  // "yyyy-mm-dd" strings, so lexicographic order matches chronological
  // order.
  while (cursor >= createdDate) {
    if (isDueOn(dueWeekdays, cursor)) {
      if (checked.has(cursor)) {
        streak++;
      } else if (cursor === today) {
        // Today is still pending — the walk continues (so yesterday's
        // streak still counts), it just isn't incremented yet.
      } else {
        break;
      }
    }
    cursor = addDaysIso(cursor, -1);
  }

  return streak;
}
