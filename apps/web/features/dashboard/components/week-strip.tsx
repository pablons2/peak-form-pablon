import type { DaySessionStatus, WeekDashboard } from "../api-client";
import { DAY_STATUS_BADGE_CLASS, formatWeekday } from "../labels";

// A glyph per status, not color alone (product design spec — status is
// never conveyed by color alone).
const DAY_STATUS_GLYPH: Record<DaySessionStatus, string> = {
  COMPLETED: "✓",
  MISSED: "✕",
  CANCELLED: "–",
  SCHEDULED: "○",
  REST: "·",
};

// PRD 09 §5.2 — a 7-day-at-a-glance strip: one dot per day, weekday-letter
// labeled, colored by the same status vocabulary the training-execution
// module already uses (plus REST, this module's own synthetic state).
export function WeekStrip({ strip }: { strip: WeekDashboard["strip"] }) {
  return (
    <ol className="flex justify-between gap-1">
      {strip.map((day) => (
        <li key={day.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">{formatWeekday(day.date)}</span>
          <span
            aria-label={day.status}
            title={day.status}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${DAY_STATUS_BADGE_CLASS[day.status]}`}
          >
            {DAY_STATUS_GLYPH[day.status]}
          </span>
        </li>
      ))}
    </ol>
  );
}
