"use client";

// PRD 08 §5.4 — a simple daily water counter, feeding the same daily view
// as food logging. One tap per glass, no form.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logHydrationAction } from "../actions";

export function HydrationCounter({ initialAmount }: { initialAmount: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState(initialAmount);
  const [saving, setSaving] = useState(false);

  async function addGlass() {
    setSaving(true);
    const result = await logHydrationAction({ amount: 1 });
    setSaving(false);
    if (result.ok) {
      setAmount((a) => a + 1);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-semibold text-foreground">{amount}</span>
      <span className="text-sm text-muted-foreground">copos hoje</span>
      <button
        type="button"
        onClick={addGlass}
        disabled={saving}
        className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        + 1 copo
      </button>
    </div>
  );
}
