"use client";

import { useState } from "react";
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
    </div>
  );
}
