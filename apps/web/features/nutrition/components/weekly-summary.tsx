import type { WeeklyAdherenceSummary } from "../api-client";

// PRD 08 §5.6 — days-logged + average macro adherence % over the past 7
// days. Rendered identically for the Client's own view and the
// Nutritionist's view of that Client (same endpoint/numbers, §10 AC).
export function WeeklySummaryCard({ summary }: { summary: WeeklyAdherenceSummary }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">Resumo semanal</h3>
      <div className="mt-2 flex gap-6 text-sm">
        <div>
          <div className="text-2xl font-semibold text-foreground">{summary.daysLogged}</div>
          <div className="text-muted-foreground">dias registrados (7 dias)</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-foreground">
            {summary.averageAdherencePercent}%
          </div>
          <div className="text-muted-foreground">aderência média</div>
        </div>
      </div>
    </div>
  );
}
