"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PrescriptionExerciseInput } from "@peakform/validation";
import { FormError } from "../../auth/components/fields";
import { replaceSessionExercisesAction } from "../actions";
import type { ContraindicationWarning, PublicSession } from "../api-client";
import {
  PrescriptionListEditor,
  type PickableExercise,
} from "./prescription-list-editor";
import { ContraindicationWarnings } from "./contraindication-warnings";

// PRD 06 §5.4 — a one-off substitution for a single dated Session; the
// underlying weekly template and every other generated session stay
// untouched (proven at the API layer, PRD 15 §7).
export function SessionExerciseForm({
  session,
  availableExercises,
}: {
  session: PublicSession;
  availableExercises: PickableExercise[];
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState<PrescriptionExerciseInput[]>(
    session.sessionExercises.map((e) => ({
      exerciseId: e.exerciseId,
      order: e.order,
      targetSets: e.targetSets,
      targetRepsMin: e.targetRepsMin,
      targetRepsMax: e.targetRepsMax,
      targetLoad: e.targetLoad,
      targetPercent1RM: e.targetPercent1RM,
      targetRpe: e.targetRpe,
      targetRir: e.targetRir,
      restSeconds: e.restSeconds,
      tempo: e.tempo,
      notes: e.notes,
    })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [warnings, setWarnings] = useState<ContraindicationWarning[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setWarnings([]);
    const result = await replaceSessionExercisesAction(session.id, {
      exercises: exercises.map((ex, i) => ({ ...ex, order: i + 1 })),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setWarnings(result.warnings ?? []);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <ContraindicationWarnings warnings={warnings} />
      <PrescriptionListEditor
        exercises={exercises}
        onChange={setExercises}
        availableExercises={availableExercises}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar exercícios desta sessão"}
      </button>
    </form>
  );
}
