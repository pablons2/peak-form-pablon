// PT-BR display copy for the Today/This Week Dashboard (PRD 09) — mirrors
// features/client-training-execution/labels.ts's convention. REST is a
// dashboard-only synthetic state (a day with no Session at all), so it's
// added here rather than in the module that actually owns Session.status.
import {
  SESSION_STATUS_BADGE_CLASS,
  SESSION_STATUS_LABELS,
} from "../client-training-execution/labels";
import type { DaySessionStatus } from "./api-client";

export const DAY_STATUS_LABELS: Record<DaySessionStatus, string> = {
  ...SESSION_STATUS_LABELS,
  REST: "Descanso",
} as Record<DaySessionStatus, string>;

export const DAY_STATUS_BADGE_CLASS: Record<DaySessionStatus, string> = {
  ...SESSION_STATUS_BADGE_CLASS,
  REST: "bg-muted text-muted-foreground",
} as Record<DaySessionStatus, string>;

export const WEEKDAY_SHORT_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

// The strip's `date` values are pure calendar dates (§5.2 — "today-6..
// today"), so every read here stays in UTC rather than converting to a
// local timezone — the same UTC-pinning session-history-list.tsx uses for
// Session.date, and the fix applied to relationships/labels.ts's
// formatDate for the same reason (see that file's comment).
export function formatWeekday(dateIso: string): string {
  const jsWeekday = new Date(`${dateIso}T00:00:00.000Z`).getUTCDay();
  return WEEKDAY_SHORT_LABELS[jsWeekday]!;
}

export function formatDayMonth(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}
