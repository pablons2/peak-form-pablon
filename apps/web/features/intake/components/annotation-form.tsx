"use client";

// PRD 03 §5.4 — a Professional's clinical annotation on one specific intake
// version, independent of the Client-authored fields.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addProfessionalAnnotationAction } from "../actions";

export function AnnotationForm({ intakeAssessmentId }: { intakeAssessmentId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    if (!note.trim()) return;
    setPending(true);
    setError(undefined);
    const result = await addProfessionalAnnotationAction(intakeAssessmentId, { note });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <label
        htmlFor="annotationNote"
        className="block text-sm font-medium text-foreground"
      >
        Adicionar anotação clínica
      </label>
      <textarea
        id="annotationNote"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Ex.: Liberado para treino leve, evitar pressão acima da cabeça."
      />
      <button
        type="button"
        disabled={pending || !note.trim()}
        onClick={submit}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar anotação"}
      </button>
    </div>
  );
}
