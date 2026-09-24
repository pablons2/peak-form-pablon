"use client";

// PRD 07 §5.1/§5.3/§7 — the Client's primary, highest-frequency screen:
// today's session, one exercise card per prescribed exercise, and a manual
// "mark complete" action for when fewer sets than prescribed are enough for
// the day (auto-completion, §5.3, happens server-side on every logged set —
// this button is only for the "I'm done, even though it's not all logged"
// case).
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicSessionExecution } from "../api-client";
import { completeSessionAction } from "../actions";
import { SESSION_STATUS_BADGE_CLASS, SESSION_STATUS_LABELS } from "../labels";
import { SessionExerciseLogger } from "./session-exercise-logger";

export function TodaySessionView({
  session,
  exerciseMedia,
  accessToken,
}: {
  session: PublicSessionExecution;
  exerciseMedia: Record<string, string | null>;
  accessToken?: string;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const isCancelled = session.status === "CANCELLED";
  const isDone = session.status === "COMPLETED" || isCancelled;

  async function handleComplete() {
    setCompleting(true);
    await completeSessionAction(session.id);
    setCompleting(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Treino de hoje</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${SESSION_STATUS_BADGE_CLASS[session.status] ?? ""}`}
        >
          {SESSION_STATUS_LABELS[session.status] ?? session.status}
        </span>
      </div>

      <div className="space-y-3">
        {session.exercises.map((exercise) => (
          <SessionExerciseLogger
            key={exercise.id}
            sessionId={session.id}
            exercise={exercise}
            mediaUrl={exerciseMedia[exercise.exerciseId]}
            disabled={isDone}
            accessToken={accessToken}
          />
        ))}
      </div>

      {!isDone ? (
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="min-h-11 w-full rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-card disabled:opacity-60"
        >
          {completing ? "Concluindo…" : "Concluir treino de hoje"}
        </button>
      ) : null}
    </div>
  );
}
