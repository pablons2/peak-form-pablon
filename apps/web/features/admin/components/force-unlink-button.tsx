"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { forceUnlinkAction } from "../actions";
import { ADMIN_LABELS } from "../labels";
import { FormError } from "../../auth/components/fields";

const dangerClass =
  "rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

// PRD 13 §5.4 — dispute resolution / cleanup force-unlink.
export function ForceUnlinkButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(undefined);
    const result = await forceUnlinkAction(linkId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} disabled={pending} className={dangerClass}>
        {pending ? "…" : ADMIN_LABELS.forceUnlink}
      </button>
      <FormError message={error} />
    </span>
  );
}
