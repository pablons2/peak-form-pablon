"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye } from "lucide-react";
import { ExerciseMediaCard } from "@/features/exercises/components/exercise-media-card";
import type { PublicSessionExerciseExecution } from "../api-client";
import type { PublicExercise } from "@/features/exercises/api-client";

export function SessionExerciseReview({
  exercise,
  exerciseDetails,
  isContraindicated = false,
}: {
  exercise: PublicSessionExerciseExecution;
  exerciseDetails?: PublicExercise | null;
  isContraindicated?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const completedSets = exercise.logs.length;
  const isComplete = completedSets >= exercise.targetSets;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Exercise Info with Media */}
      {exerciseDetails ? (
        <div className="space-y-2">
          <ExerciseMediaCard
            exercise={exerciseDetails}
            isContraindicated={isContraindicated}
            className="mb-4"
          />
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Eye className="h-4 w-4" />
            Ver detalhes completos
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <h3 className="font-semibold text-foreground text-lg">{exercise.exerciseName}</h3>
        </div>
      )}

      {/* Prescribed vs Actual Comparison */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Prescrição vs Execução</h4>

        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Prescribed */}
          <div className="rounded-md bg-muted p-3 space-y-2">
            <p className="font-medium text-muted-foreground">Prescrito</p>
            <div className="space-y-1 text-foreground">
              <p>
                <span className="font-semibold">{exercise.targetSets}</span> séries
              </p>
              <p>
                {exercise.targetRepsMin}
                {exercise.targetRepsMax ? `–${exercise.targetRepsMax}` : ""} repetições
              </p>
              {exercise.targetLoad && (
                <p>
                  <span className="font-semibold">{exercise.targetLoad}</span> kg
                </p>
              )}
              {exercise.targetRpe !== null && (
                <p>
                  RPE: <span className="font-semibold">{exercise.targetRpe}</span>
                </p>
              )}
              {exercise.targetRir !== null && (
                <p>
                  RIR: <span className="font-semibold">{exercise.targetRir}</span>
                </p>
              )}
            </div>
          </div>

          {/* Actual */}
          <div
            className={`rounded-md p-3 space-y-2 ${
              isComplete ? "bg-success/10" : "bg-warning/10"
            }`}
          >
            <p className={`font-medium ${isComplete ? "text-success" : "text-warning"}`}>
              {isComplete ? "✓ Completo" : "⚠ Incompleto"}
            </p>
            <div className="space-y-1 text-foreground">
              <p>
                <span className="font-semibold">{completedSets}</span> séries
              </p>
              {exercise.logs.length > 0 ? (
                <>
                  <p>
                    Média:{" "}
                    <span className="font-semibold">
                      {(
                        exercise.logs.reduce((sum, log) => sum + log.actualReps, 0) /
                        exercise.logs.length
                      ).toFixed(0)}
                    </span>{" "}
                    reps
                  </p>
                  {exercise.logs.some((log) => log.actualLoad !== null) && (
                    <p>
                      Carga: Última{" "}
                      <span className="font-semibold">
                        {exercise.logs[exercise.logs.length - 1]?.actualLoad}
                      </span>{" "}
                      kg
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">Nenhuma série registrada</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logged Sets Detail */}
      {exercise.logs.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-border">
          <h4 className="text-sm font-medium text-foreground">Séries Registradas</h4>
          <div className="space-y-2">
            {exercise.logs.map((log) => (
              <div key={log.id} className="text-xs bg-muted rounded-md p-2 space-y-1">
                <div className="flex justify-between items-center text-foreground">
                  <span className="font-semibold">Série {log.setNumber}</span>
                  <span className="text-muted-foreground">
                    {new Date(log.loggedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">{log.actualReps}</span> reps
                  </p>
                  {log.actualLoad !== null && (
                    <p>
                      <span className="font-semibold text-foreground">{log.actualLoad}</span> kg
                    </p>
                  )}
                  {log.actualRpeOrRir !== null && (
                    <p>
                      <span className="font-semibold text-foreground">{log.actualRpeOrRir}</span>{" "}
                      {exercise.targetRpe !== null ? "RPE" : "RIR"}
                    </p>
                  )}
                </div>
                {log.note && (
                  <p className="text-muted-foreground italic">Nota: {log.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Notes */}
      {exercise.notes && (
        <div className="space-y-2 pt-3 border-t border-border">
          <h4 className="text-sm font-medium text-foreground">Observações</h4>
          <p className="text-xs text-muted-foreground">{exercise.notes}</p>
        </div>
      )}

      {/* Form Check Video (stub) */}
      <div className="pt-3 border-t border-border">
        <button
          disabled
          className="text-xs px-3 py-1.5 rounded-md bg-muted text-muted-foreground cursor-not-allowed"
        >
          📹 Vídeo de forma (em breve)
        </button>
      </div>

      {showModal && exerciseDetails && (
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
                    {exerciseDetails.name}
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
                    exercise={exerciseDetails}
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
