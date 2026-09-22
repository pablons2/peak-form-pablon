import Link from "next/link";
import type { PublicSessionExecution } from "../../client-training-execution/api-client";
import { SESSION_STATUS_BADGE_CLASS, SESSION_STATUS_LABELS } from "../../client-training-execution/labels";

// PRD 09 §5.1/§7 — a glance card, not the full logging UI (that's /today's
// job, linked from here). A rest day is a normal, expected state — shown
// plainly, not as an empty/error state.
export function TodayTrainingCard({
  session,
  isRestDay,
}: {
  session: PublicSessionExecution | null;
  isRestDay: boolean;
}) {
  if (isRestDay || !session) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Treino</h2>
        <p className="mt-1 text-sm text-muted-foreground">Dia de descanso.</p>
      </div>
    );
  }

  const loggedExercises = session.exercises.filter((e) => e.logs.length > 0).length;

  return (
    <Link
      href="/today"
      className="block rounded-lg border border-border bg-card p-4 hover:bg-muted"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Treino de hoje</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${SESSION_STATUS_BADGE_CLASS[session.status] ?? ""}`}
        >
          {SESSION_STATUS_LABELS[session.status] ?? session.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {loggedExercises} de {session.exercises.length} exercício(s) registrado(s)
      </p>
    </Link>
  );
}
