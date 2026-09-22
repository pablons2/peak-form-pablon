"use client";

// PRD 04 §5.1/§7 — the Client's quick self-log, target under 15 seconds:
// weight (required), an optional photo, an optional note. Deliberately a
// single screen with no multi-step flow — friction kills adherence for
// something meant to be logged daily.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "../../auth/components/fields";
import { createSelfLogAction } from "../actions";

export function SelfLogForm() {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const weightNum = Number(weight);
    if (!weightNum || weightNum <= 0) {
      setError("Informe um peso válido.");
      return;
    }
    setSaving(true);
    setError(undefined);
    const result = await createSelfLogAction({
      weight: weightNum,
      note: note || undefined,
      photo: fileRef.current?.files?.[0] ?? null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setWeight("");
    setNote("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-end gap-3">
        <label className="flex-1 text-sm font-medium text-foreground">
          Peso (kg)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="1"
            max="500"
            required
            autoFocus
            className={inputClass}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Registrar"}
        </button>
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Foto ou nota (opcional)
        </summary>
        <div className="mt-2 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-foreground"
          />
          <input
            type="text"
            placeholder="Nota (opcional)"
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </details>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
