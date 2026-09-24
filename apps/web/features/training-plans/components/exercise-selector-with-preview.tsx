"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { PublicExercise } from "@/features/exercises/api-client";
import { ExerciseMediaCard } from "@/features/exercises/components/exercise-media-card";

export interface ExerciseOption {
  id: string;
  name: string;
}

export function ExerciseSelectorWithPreview({
  value,
  onChange,
  availableExercises,
  exerciseDetails,
  contraindicatedExerciseIds = [],
  className = "",
}: {
  value: string;
  onChange: (exerciseId: string) => void;
  availableExercises: ExerciseOption[];
  exerciseDetails?: Record<string, PublicExercise>;
  contraindicatedExerciseIds?: string[];
  className?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const selectedExercise = value && exerciseDetails?.[value];
  const isContraindicated = contraindicatedExerciseIds.includes(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowPreview(true)}
      >
        <option value="">Selecione um exercício…</option>
        {availableExercises.map((ex) => {
          const contraindicated = contraindicatedExerciseIds.includes(ex.id);
          return (
            <option key={ex.id} value={ex.id}>
              {ex.name}
              {contraindicated ? " ⚠️" : ""}
            </option>
          );
        })}
      </select>

      {showPreview && selectedExercise && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Visualização do exercício:</span>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-accent hover:underline"
            >
              Fechar
            </button>
          </div>
          <ExerciseMediaCard
            exercise={selectedExercise}
            isContraindicated={isContraindicated}
            className="max-h-96 overflow-y-auto"
          />
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Eye className="h-4 w-4" />
            Ver em tela cheia
          </button>
        </div>
      )}

      {isContraindicated && !showPreview && (
        <div className="text-xs text-warning font-medium">
          ⚠️ Exercício contraindicado para este cliente
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="ml-2 text-accent hover:underline"
          >
            Ver detalhes
          </button>
        </div>
      )}

      {showModal && selectedExercise && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowModal(false)}
            aria-hidden
          />

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="w-full max-w-2xl rounded-lg bg-card shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border p-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedExercise.name}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6 p-4 max-h-[70vh] overflow-y-auto">
                  <ExerciseMediaCard
                    exercise={selectedExercise}
                    isContraindicated={isContraindicated}
                  />
                </div>

                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
