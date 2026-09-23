"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveProfessionalAction, rejectProfessionalAction } from "../actions";
import { ADMIN_LABELS } from "../labels";
import { FormError } from "../../auth/components/fields";

const buttonClass =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const dangerClass =
  "rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

// PRD 13 §5.2 — surfaces PRD 01's approve/reject queue in the console.
export function ApprovalActions({
  userId,
  emailVerified,
}: {
  userId: string;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function onApprove() {
    if (!emailVerified) return;
    setPending("approve");
    setError(undefined);
    const result = await approveProfessionalAction(userId);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function onReject() {
    setPending("reject");
    setError(undefined);
    const result = await rejectProfessionalAction(userId, reason.trim() || undefined);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={ADMIN_LABELS.rejectReasonPlaceholder}
        className="w-48 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReject}
          disabled={pending !== null}
          className={dangerClass}
        >
          {pending === "reject" ? "…" : ADMIN_LABELS.reject}
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={pending !== null || !emailVerified}
          title={
            emailVerified ? undefined : ADMIN_LABELS.approveDisabledUntilVerified
          }
          className={buttonClass}
        >
          {pending === "approve" ? "…" : ADMIN_LABELS.approve}
        </button>
      </div>
      <FormError message={error} />
    </div>
  );
}
