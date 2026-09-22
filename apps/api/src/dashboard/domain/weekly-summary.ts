// PRD 09 §5.2/§6 — pure computation over data already fetched from the
// owning modules (PRD 07 sessions, PRD 04 body assessments). No new
// persisted entity: this is the single function both a Client-facing view
// and, per §5.2's "shared with the linked Professional" note, any future
// Professional-facing surface would call to guarantee identical numbers —
// the same "shared pure function" precedent as PRD 08's
// computeWeeklyAdherenceSummary. Only the Client-facing consumer is wired
// in this phase (§3 explicitly scopes a Professional dashboard out).
//
// "This week" is a rolling 7-day window ending today (today-6..today), not
// a calendar Monday-Sunday week — the same rolling-window convention PRD
// 08's weekly adherence already established, kept consistent rather than
// introducing a second "week" definition into the app.

export type DaySessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED"
  | "REST";

export interface SessionSummaryInput {
  date: string; // "YYYY-MM-DD"
  status: "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
  tonnage: number;
}

export interface DayStrip {
  date: string;
  status: DaySessionStatus;
}

// Seven ISO date strings, today-6..today, ascending.
export function lastSevenDays(today: string): string[] {
  const base = new Date(`${today}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

// One row per day in `days` — a day with no Session at all is a rest day,
// not an error state. A day with more than one Session (theoretically
// possible across overlapping plans, not something v1's single-active-plan
// generation produces) takes the first match — an edge case deliberately
// left unresolved rather than guessed at.
export function computeWeekStrip(
  sessions: SessionSummaryInput[],
  days: string[],
): DayStrip[] {
  return days.map((date) => {
    const session = sessions.find((s) => s.date === date);
    return { date, status: session ? session.status : "REST" };
  });
}

export interface TrainingAdherence {
  completed: number;
  scheduledTotal: number;
  percent: number | null; // null = no non-cancelled sessions this week
}

// CANCELLED sessions don't count against adherence — they were removed
// from the schedule, not missed (same exclusion PRD 07's
// findScheduledPastDue query already applies to the missed-session job).
export function computeTrainingAdherence(
  sessions: SessionSummaryInput[],
): TrainingAdherence {
  const scheduled = sessions.filter((s) => s.status !== "CANCELLED");
  const completed = scheduled.filter((s) => s.status === "COMPLETED").length;
  return {
    completed,
    scheduledTotal: scheduled.length,
    percent:
      scheduled.length === 0
        ? null
        : Math.round((completed / scheduled.length) * 100),
  };
}

export interface VolumeTrend {
  thisWeekTonnage: number;
  priorWeekTonnage: number;
  deltaPercent: number | null; // null when there's no prior-week baseline
}

export function computeVolumeTrend(
  thisWeekSessions: SessionSummaryInput[],
  priorWeekSessions: SessionSummaryInput[],
): VolumeTrend {
  const thisWeekTonnage = sumTonnage(thisWeekSessions);
  const priorWeekTonnage = sumTonnage(priorWeekSessions);
  return {
    thisWeekTonnage,
    priorWeekTonnage,
    deltaPercent:
      priorWeekTonnage === 0
        ? null
        : Math.round(
            ((thisWeekTonnage - priorWeekTonnage) / priorWeekTonnage) * 100,
          ),
  };
}

function sumTonnage(sessions: SessionSummaryInput[]): number {
  return sessions.reduce((sum, s) => sum + s.tonnage, 0);
}

export interface WeightEntryInput {
  recordedAt: string; // ISO datetime
  weight: number;
}

export interface WeightTrend {
  latest: number | null;
  previous: number | null;
  deltaKg: number | null;
}

// "previous" is the most recent entry recorded strictly before this week's
// start — the closest available comparison point to "a week ago," which
// degrades gracefully (null) for a Client with under a week of history
// instead of guessing at an interpolated value.
export function computeWeightTrend(
  assessments: WeightEntryInput[],
  weekStartIso: string,
): WeightTrend {
  const sorted = [...assessments].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );
  const latest = sorted[0]?.weight ?? null;
  const previousEntry = sorted.find(
    (a) => a.recordedAt.slice(0, 10) < weekStartIso,
  );
  const previous = previousEntry?.weight ?? null;
  return {
    latest,
    previous,
    deltaKg:
      latest !== null && previous !== null
        ? Math.round((latest - previous) * 10) / 10
        : null,
  };
}

export interface CheckInScheduleInput {
  status: "ACTIVE" | "CANCELLED" | "FIRED";
  nextDueAt: string | null; // ISO datetime
}

// Earliest upcoming due date across every ACTIVE schedule on every one of
// the Client's active links — the same nextDueAt field PRD 12's
// CHECK_IN_DUE notification fires from, so the dashboard and the
// notification can never disagree (PRD 09 §5.1).
export function nearestCheckIn(
  schedules: CheckInScheduleInput[],
): string | null {
  const due = schedules
    .filter((s) => s.status === "ACTIVE" && s.nextDueAt !== null)
    .map((s) => s.nextDueAt!)
    .sort();
  return due[0] ?? null;
}
