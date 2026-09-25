// PRD 08 §5.6 — the acompanhamento panel's 4-week adherence trend as simple
// horizontal bars (oldest window first, current week last). Pure
// presentational — the data comes from the adherence-history endpoint.
import type { AdherenceHistory } from "../api-client";

function barColor(percent: number): string {
  if (percent >= 80) return "bg-success";
  if (percent >= 50) return "bg-warning";
  return "bg-destructive";
}

export function AdherenceTrend({ history }: { history: AdherenceHistory }) {
  return (
    <ul className="space-y-2">
      {history.weeks.map((week, index) => (
        <li key={week.weekStart} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">
            {index === history.weeks.length - 1
              ? "Esta semana"
              : `Semana -${history.weeks.length - 1 - index}`}
          </span>
          <div
            role="progressbar"
            aria-valuenow={week.averageAdherencePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Aderência da semana de ${week.weekStart}: ${week.averageAdherencePercent}%`}
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full ${barColor(week.averageAdherencePercent)}`}
              style={{ width: `${Math.min(100, week.averageAdherencePercent)}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
            {week.averageAdherencePercent}% · {week.daysLogged}d
          </span>
        </li>
      ))}
    </ul>
  );
}
