"use client";

// PRD 06 §5.3/§5.4/§5.6 — the weekly microcycle template builder: toggle
// which weekdays have a session, name each one, and prescribe its
// exercises. Saving replaces the mesocycle's whole template (§5.3's
// "which weekdays have a session ... and which Session template applies to
// each") and regenerates dated Sessions for any not-yet-generated slot.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PrescriptionExerciseInput, WeekdayInput } from "@peakform/validation";
import { FormError } from "../../auth/components/fields";
import { saveWeeklyTemplateAction } from "../actions";
import type { ContraindicationWarning, PublicWeeklyTemplate } from "../api-client";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "../labels";
import {
  PrescriptionListEditor,
  type PickableExercise,
} from "./prescription-list-editor";
import { ContraindicationWarnings } from "./contraindication-warnings";

interface DayState {
  enabled: boolean;
  name: string;
  exercises: PrescriptionExerciseInput[];
}

function initialState(existing: PublicWeeklyTemplate[]): Record<WeekdayInput, DayState> {
  const byWeekday = new Map(existing.map((t) => [t.weekday, t]));
  return Object.fromEntries(
    WEEKDAY_ORDER.map((weekday) => {
      const template = byWeekday.get(weekday);
      return [
        weekday,
        {
          enabled: Boolean(template),
          name: template?.name ?? "",
          exercises: (template?.exercises ?? []).map((e) => ({
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
        },
      ];
    }),
  ) as Record<WeekdayInput, DayState>;
}

export function WeeklyTemplateEditor({
  mesocycleId,
  existing,
  availableExercises,
}: {
  mesocycleId: string;
  existing: PublicWeeklyTemplate[];
  availableExercises: PickableExercise[];
}) {
  const router = useRouter();
  const [days, setDays] = useState<Record<WeekdayInput, DayState>>(() =>
    initialState(existing),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [warnings, setWarnings] = useState<ContraindicationWarning[]>([]);

  function updateDay(weekday: WeekdayInput, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [weekday]: { ...prev[weekday], ...patch } }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setWarnings([]);

    const entries = WEEKDAY_ORDER.filter((weekday) => days[weekday].enabled).map(
      (weekday) => ({
        weekday,
        name: days[weekday].name || (WEEKDAY_LABELS[weekday] ?? weekday),
        exercises: days[weekday].exercises.map((ex, i) => ({ ...ex, order: i + 1 })),
      }),
    );

    const result = await saveWeeklyTemplateAction(mesocycleId, { entries });
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

      {WEEKDAY_ORDER.map((weekday) => {
        const day = days[weekday];
        return (
          <div key={weekday} className="rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={day.enabled}
                onChange={(e) => updateDay(weekday, { enabled: e.target.checked })}
              />
              {WEEKDAY_LABELS[weekday]}
            </label>

            {day.enabled ? (
              <div className="mt-3 space-y-3">
                <input
                  aria-label={`Nome do treino — ${WEEKDAY_LABELS[weekday]}`}
                  placeholder="Nome do treino (ex.: Treino A)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  value={day.name}
                  onChange={(e) => updateDay(weekday, { name: e.target.value })}
                />
                <PrescriptionListEditor
                  exercises={day.exercises}
                  onChange={(exercises) => updateDay(weekday, { exercises })}
                  availableExercises={availableExercises}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar template semanal"}
      </button>
    </form>
  );
}
