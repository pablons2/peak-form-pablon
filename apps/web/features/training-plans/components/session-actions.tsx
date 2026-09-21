"use client";

// PRD 06 §5.4 — move/cancel one dated Session instance without touching the
// template or any other generated session.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSessionAction, moveSessionAction } from "../actions";

export function SessionActions({
  sessionId,
  currentDate,
  cancelled,
}: {
  sessionId: string;
  currentDate: string;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [movingOpen, setMovingOpen] = useState(false);
  const [newDate, setNewDate] = useState(currentDate.slice(0, 10));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (cancelled) return null;

  async function confirmMove() {
    setPending(true);
    setError(undefined);
    const result = await moveSessionAction(sessionId, { date: new Date(newDate) });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMovingOpen(false);
    router.refresh();
  }

  async function confirmCancel() {
    setPending(true);
    setError(undefined);
    const result = await cancelSessionAction(sessionId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {movingOpen ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Nova data da sessão"
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <button
            type="button"
            disabled={pending}
            onClick={confirmMove}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setMovingOpen(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMovingOpen(true)}
            className="text-sm font-medium text-accent hover:underline"
          >
            Mover sessão
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={confirmCancel}
            className="text-sm font-medium text-destructive hover:underline disabled:opacity-60"
          >
            Cancelar sessão
          </button>
        </div>
      )}
    </div>
  );
}
