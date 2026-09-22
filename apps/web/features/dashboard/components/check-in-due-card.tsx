import { formatDate } from "../../relationships/labels";

// PRD 09 §5.1 — "upcoming Professional check-in reminder, if scheduled,"
// sourced from the same CheckInSchedule.nextDueAt PRD 12's CHECK_IN_DUE
// notification fires from (§5.1's own cross-reference) — a plain line, not
// a management panel (that's the Team page's job).
export function CheckInDueCard({ nextDueAt }: { nextDueAt: string | null }) {
  if (!nextDueAt) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-medium text-foreground">Próximo check-in</h2>
      <p className="mt-1 text-sm text-muted-foreground">{formatDate(nextDueAt)}</p>
    </div>
  );
}
