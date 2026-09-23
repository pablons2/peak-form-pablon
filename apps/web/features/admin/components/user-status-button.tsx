"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deactivateUserAction, reactivateUserAction } from "../actions";
import { ADMIN_LABELS } from "../labels";
import { FormError } from "../../auth/components/fields";

const buttonClass =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const dangerClass =
  "rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

// PRD 13 §5.1 — deactivate/reactivate any account from the console.
export function UserStatusButton({
  userId,
  status,
}: {
  userId: string;
  status: "ACTIVE" | "DEACTIVATED";
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(undefined);
    const result =
      status === "ACTIVE"
        ? await deactivateUserAction(userId)
        : await reactivateUserAction(userId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={status === "ACTIVE" ? dangerClass : buttonClass}
      >
        {pending ? "…" : status === "ACTIVE" ? ADMIN_LABELS.deactivate : ADMIN_LABELS.reactivate}
      </button>
      <FormError message={error} />
    </span>
  );
}
