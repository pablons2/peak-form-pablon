import { Weekday } from "@prisma/client";

// PRD 06 §6 — "a mesocycle's effective start date is always computed as
// trainingPlan.startDate + sum(weeks of all mesocycles with a lower order)",
// deliberately never stored, so resizing/reordering an earlier mesocycle
// shifts every later one without a manual date-patching step.
//
// All date math here is UTC-day arithmetic on `@db.Date` values (no
// time-of-day component) — mirrors the UTC-timestamp fix PRD 02's
// computeNextDueDate needed after its first version silently mixed local and
// UTC math.
function addDaysUTC(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

export function sumWeeksBeforeOrder(
  mesocycles: { order: number; weeks: number }[],
  targetOrder: number,
): number {
  return mesocycles
    .filter((m) => m.order < targetOrder)
    .reduce((sum, m) => sum + m.weeks, 0);
}

export function computeMesocycleStartDate(
  planStartDate: Date,
  priorWeeks: number,
): Date {
  return addDaysUTC(planStartDate, priorWeeks * 7);
}

const WEEKDAY_FROM_JS_INDEX: Weekday[] = [
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
];

export interface CandidateSessionSlot {
  date: Date;
  weekday: Weekday;
}

// PRD 06 §5.4 — every calendar day across the mesocycle's span whose weekday
// has a template entry, paired with which weekday matched (so the caller can
// look up that weekday's exercise list without re-deriving it). Pure/
// candidate-only: it does not know which dates already have a generated
// Session — the use-case diffs this list against existing rows so
// generation stays additive-only (§5.4 — "never silently rewrites sessions
// the Client may have already seen/logged against").
export function candidateSessionSlots(
  mesocycleStartDate: Date,
  weeks: number,
  templateWeekdays: Weekday[],
): CandidateSessionSlot[] {
  const weekdaySet = new Set(templateWeekdays);
  const totalDays = weeks * 7;
  const slots: CandidateSessionSlot[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDaysUTC(mesocycleStartDate, i);
    // getUTCDay() is always 0-6, and WEEKDAY_FROM_JS_INDEX always has all 7.
    const weekday = WEEKDAY_FROM_JS_INDEX[date.getUTCDay()]!;
    if (weekdaySet.has(weekday)) slots.push({ date, weekday });
  }
  return slots;
}
