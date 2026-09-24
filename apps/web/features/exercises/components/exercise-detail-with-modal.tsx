"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { PublicExercise } from "../api-client";
import { ExerciseDetail } from "./exercise-detail";
import { ExerciseMediaCard } from "./exercise-media-card";

export function ExerciseDetailWithModal({
  exercise,
  showModalButton = true,
}: {
  exercise: PublicExercise;
  showModalButton?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        {showModalButton && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Eye className="h-4 w-4" />
            Visualizar em detalhes
          </button>
        )}
        <ExerciseDetail exercise={exercise} />
      </div>

      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setModalOpen(false)}
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
                    {exercise.name}
                  </h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6 p-4">
                  <ExerciseMediaCard exercise={exercise} />
                </div>

                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  <button
                    onClick={() => setModalOpen(false)}
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
    </>
  );
}
