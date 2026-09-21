"use client";

// PRD 03 §5.3 — "Skip requires the Client to read and check an explicit risk
// disclaimer before the skip is recorded — a deliberate friction point, not
// a silent bypass." Inline confirmation panel (no modal library in this
// repo yet) that only enables the confirm action once the checkbox is
// checked.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { skipIntakeAction } from "../actions";

export function SkipIntakeDialog({ intakeId }: { intakeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-muted-foreground underline hover:text-foreground"
      >
        Pular triagem por enquanto
      </button>
    );
  }

  async function confirmSkip() {
    setPending(true);
    setError(undefined);
    const result = await skipIntakeAction(intakeId, { acknowledged: true });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div
      role="alertdialog"
      aria-label="Confirmar pular triagem"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
    >
      <p className="text-sm font-medium text-foreground">
        Entendo que treinar sem uma triagem de saúde completa envolve riscos, e
        que posso completá-la depois.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <label className="mt-3 flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        Li e entendo o aviso acima.
      </label>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={!acknowledged || pending}
          onClick={confirmSkip}
          className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Confirmar e pular"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
