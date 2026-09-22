import type { WeekDashboard } from "../api-client";

function TrendArrow({ deltaPercent }: { deltaPercent: number | null }) {
  if (deltaPercent === null) return <span className="text-muted-foreground">–</span>;
  if (deltaPercent === 0) return <span className="text-muted-foreground">= 0%</span>;
  return deltaPercent > 0 ? (
    <span className="text-accent">↑ {deltaPercent}%</span>
  ) : (
    <span className="text-destructive">↓ {Math.abs(deltaPercent)}%</span>
  );
}

// PRD 09 §5.2 — the weekly summary card: training adherence %, volume
// (tonnage) trend vs. the prior week, weight trend vs. the prior week's
// closest entry. Every number here comes straight from the pure
// computeWeeklySummary functions the API already ran — this component only
// lays them out, never recomputes.
export function WeeklySummaryCard({
  trainingAdherence,
  volumeTrend,
  weightTrend,
}: {
  trainingAdherence: WeekDashboard["trainingAdherence"];
  volumeTrend: WeekDashboard["volumeTrend"];
  weightTrend: WeekDashboard["weightTrend"];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-foreground">Resumo da semana</h2>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs text-muted-foreground">Adesão</dt>
          <dd className="mt-1 text-base font-semibold text-foreground">
            {trainingAdherence.percent === null ? "–" : `${trainingAdherence.percent}%`}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {trainingAdherence.completed}/{trainingAdherence.scheduledTotal}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Volume</dt>
          <dd className="mt-1 text-base font-semibold text-foreground">
            {Math.round(volumeTrend.thisWeekTonnage)}kg
          </dd>
          <dd className="text-xs">
            <TrendArrow deltaPercent={volumeTrend.deltaPercent} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Peso</dt>
          <dd className="mt-1 text-base font-semibold text-foreground">
            {weightTrend.latest === null ? "–" : `${weightTrend.latest}kg`}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {weightTrend.deltaKg === null
              ? "–"
              : `${weightTrend.deltaKg > 0 ? "+" : ""}${weightTrend.deltaKg}kg`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
