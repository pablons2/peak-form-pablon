"use client";

// PRD 06 §5.5 — one Session's (or weekday template's) list of exercise
// prescriptions: exercise, order, sets, reps (or rep range), load (absolute
// or %1RM), RPE or RIR, rest, tempo, notes. Plain local-state array editor —
// same "array of objects in component state, add/remove via a callback"
// pattern the intake wizard's body-map picker uses, not react-hook-form
// (these are nested object arrays, not flat form fields).
// Phase 3.1 enhancement: use ExerciseSelectorWithPreview for exercise selection
// with media preview + contraindication filtering.
import type { PrescriptionExerciseInput } from "@peakform/validation";
import type { PublicExercise } from "@/features/exercises/api-client";
import type { ClientIntake } from "@/features/relationships/api-client";
import { ExerciseSelectorWithPreview } from "./exercise-selector-with-preview";
import { useContraindicationFilter } from "../hooks/use-contraindication-filter";

export interface PickableExercise {
  id: string;
  name: string;
}

const smallInputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function field(label: string, children: React.ReactNode) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

export function PrescriptionListEditor({
  exercises,
  onChange,
  availableExercises,
  exerciseDetails,
  clientIntake,
}: {
  exercises: PrescriptionExerciseInput[];
  onChange: (exercises: PrescriptionExerciseInput[]) => void;
  availableExercises: PickableExercise[];
  exerciseDetails?: Record<string, PublicExercise>;
  clientIntake?: ClientIntake | null;
}) {
  const { isContraindicated } = useContraindicationFilter(clientIntake ?? null);

  // Phase 3.1: Build list of contraindicated exercise IDs for the selector
  const contraindicatedExerciseIds = exerciseDetails
    ? Object.entries(exerciseDetails)
        .filter(([_, ex]) => isContraindicated(ex))
        .map(([id]) => id)
    : [];

  function updateRow(index: number, patch: Partial<PrescriptionExerciseInput>) {
    onChange(exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function removeRow(index: number) {
    onChange(exercises.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i + 1 })));
  }

  function addRow() {
    const firstExercise = availableExercises[0];
    onChange([
      ...exercises,
      {
        exerciseId: firstExercise?.id ?? "",
        order: exercises.length + 1,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetLoad: null,
        targetPercent1RM: null,
        targetRpe: null,
        targetRir: null,
        restSeconds: 60,
        tempo: null,
        notes: null,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      {exercises.map((exercise, index) => (
        <div key={index} className="rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {/* Phase 3.1: Use ExerciseSelectorWithPreview if exerciseDetails available */}
              {exerciseDetails ? (
                <ExerciseSelectorWithPreview
                  value={exercise.exerciseId}
                  onChange={(id) => updateRow(index, { exerciseId: id })}
                  availableExercises={availableExercises}
                  exerciseDetails={exerciseDetails}
                  contraindicatedExerciseIds={contraindicatedExerciseIds}
                  className="mt-1"
                />
              ) : (
                field(
                  "Exercício",
                  <select
                    aria-label={`Exercício ${index + 1}`}
                    className={smallInputClass}
                    value={exercise.exerciseId}
                    onChange={(e) => updateRow(index, { exerciseId: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {availableExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>,
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => removeRow(index)}
              aria-label={`Remover linha ${index + 1}`}
              className="mt-5 shrink-0 rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            >
              ✕
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {field(
              "Séries",
              <input
                type="number"
                min={1}
                aria-label={`Séries ${index + 1}`}
                className={smallInputClass}
                value={exercise.targetSets}
                onChange={(e) => updateRow(index, { targetSets: Number(e.target.value) })}
              />,
            )}
            {field(
              "Reps min",
              <input
                type="number"
                min={1}
                aria-label={`Reps mínimas ${index + 1}`}
                className={smallInputClass}
                value={exercise.targetRepsMin}
                onChange={(e) => updateRow(index, { targetRepsMin: Number(e.target.value) })}
              />,
            )}
            {field(
              "Reps max",
              <input
                type="number"
                min={1}
                aria-label={`Reps máximas ${index + 1}`}
                className={smallInputClass}
                value={exercise.targetRepsMax ?? ""}
                onChange={(e) =>
                  updateRow(index, {
                    targetRepsMax: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />,
            )}
            {field(
              "Carga (kg)",
              <input
                type="number"
                min={0}
                aria-label={`Carga ${index + 1}`}
                className={smallInputClass}
                value={exercise.targetLoad ?? ""}
                onChange={(e) =>
                  updateRow(index, {
                    targetLoad: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />,
            )}
            {field(
              "RPE",
              <input
                type="number"
                min={0}
                max={10}
                aria-label={`RPE ${index + 1}`}
                className={smallInputClass}
                value={exercise.targetRpe ?? ""}
                onChange={(e) =>
                  updateRow(index, {
                    targetRpe: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />,
            )}
            {field(
              "Descanso (s)",
              <input
                type="number"
                min={0}
                aria-label={`Descanso ${index + 1}`}
                className={smallInputClass}
                value={exercise.restSeconds ?? ""}
                onChange={(e) =>
                  updateRow(index, {
                    restSeconds: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />,
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium text-accent hover:underline"
      >
        + Adicionar exercício
      </button>
    </div>
  );
}
