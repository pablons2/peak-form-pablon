"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startOrResumeIntakeAction } from "../actions";

// PRD 03 §5.3 — "if a Client's situation changes, start a new intake
// version rather than editing the old one in place." Shown once the
// Client's latest version is finalized (COMPLETED/SKIPPED); reuses the same
// start-or-resume action the wizard's initial load already uses.
export function StartNewIntakeVersionButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function start() {
    setPending(true);
    setError(undefined);
    const result = await startOrResumeIntakeAction();
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Iniciando…" : "Iniciar nova versão da triagem"}
      </button>
    </div>
  );
}
