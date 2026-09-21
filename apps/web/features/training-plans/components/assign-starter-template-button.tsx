"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignStarterTemplateAction } from "../actions";

// PRD 06 §5.8 — a Client without an active Personal Trainer self-assigns a
// Starter Template; the backend re-checks that (a 409/403-style message
// surfaces here if it no longer holds).
export function AssignStarterTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function assign() {
    setPending(true);
    setError(undefined);
    const result = await assignStarterTemplateAction(templateId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/plans/${result.id}`);
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
        onClick={assign}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Atribuindo…" : "Atribuir a mim"}
      </button>
    </div>
  );
}
