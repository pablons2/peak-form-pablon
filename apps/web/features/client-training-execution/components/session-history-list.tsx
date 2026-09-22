// PRD 07 §5.1/§5.4 — the execution history list, reused as-is by both the
// Client's own history (below the "today" card) and the Professional's
// read-only view of a linked Client (§4) — server component, no props ever
// differ between the two beyond which sessions were fetched.
import type { PublicSessionExecution } from "../api-client";
import { SESSION_STATUS_BADGE_CLASS, SESSION_STATUS_LABELS } from "../labels";

export function SessionHistoryList({ sessions }: { sessions: PublicSessionExecution[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>;
  }
  return (
    <ul className="space-y-2">
      {sessions.map((session) => {
        const loggedExercises = session.exercises.filter((e) => e.logs.length > 0).length;
        return (
          <li
            key={session.id}
            className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {new Date(session.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.exercises.length} exercício(s) · {loggedExercises} com séries registradas
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${SESSION_STATUS_BADGE_CLASS[session.status] ?? ""}`}
            >
              {SESSION_STATUS_LABELS[session.status] ?? session.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
