import Link from "next/link";
import { MacroTotals } from "../../nutrition/components/macro-totals";
import type { DailyDiaryResult } from "../../nutrition/api-client";

// PRD 09 §5.1 — "meals logged vs. active target, if one exists; otherwise a
// simple log-your-meals prompt with no target comparison." Reuses
// MacroTotals verbatim (same numbers /nutrition itself shows, never a
// second computation) — its own no-active-target state already reads as
// that prompt, so there's nothing dashboard-specific to add on top.
export function TodayNutritionCard({ diary }: { diary: DailyDiaryResult }) {
  return (
    <Link href="/nutrition" className="block rounded-lg border border-border bg-card p-4 hover:bg-muted">
      <h2 className="text-sm font-medium text-foreground">Nutrição</h2>
      <div className="mt-2">
        <MacroTotals result={diary} />
      </div>
    </Link>
  );
}
