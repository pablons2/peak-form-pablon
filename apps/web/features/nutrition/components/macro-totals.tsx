import type { DailyDiaryResult } from "../api-client";

// PRD 08 §5.3/§5.5 — running macro totals vs. the active target for the
// current day, plus the non-clinical nudges. Renders a neutral "no active
// target yet" state when the Client has no confirmed plan — this endpoint
// (mine/diary) structurally can only ever see an ACTIVE plan, never DRAFT
// (§7), so there is nothing here that could leak an unconfirmed target.
export function MacroTotals({ result }: { result: DailyDiaryResult }) {
  const { totals, activeTarget, nudges } = result;
  return (
    <div className="space-y-3">
      {activeTarget ? (
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <TotalCell label="kcal" value={totals.calories} target={activeTarget.calorieTarget} />
          <TotalCell
            label="prot (g)"
            value={totals.protein}
            target={activeTarget.macroTargets.protein}
          />
          <TotalCell
            label="carb (g)"
            value={totals.carbs}
            target={activeTarget.macroTargets.carbs}
          />
          <TotalCell label="gord (g)" value={totals.fat} target={activeTarget.macroTargets.fat} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma meta ativa ainda — seu nutricionista ainda não confirmou uma meta.
        </p>
      )}
      {nudges.length > 0 ? (
        <ul className="space-y-1">
          {nudges.map((n) => (
            <li
              key={n.code}
              role="status"
              className="rounded-md bg-accent/10 px-3 py-1.5 text-sm text-foreground"
            >
              {n.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TotalCell({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="font-semibold text-foreground">{Math.round(value)}</div>
      <div className="text-xs text-muted-foreground">
        / {target} {label}
      </div>
    </div>
  );
}
