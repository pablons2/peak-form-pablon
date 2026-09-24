"use client";

import { X } from "lucide-react";
import type { PublicExercise } from "../../exercises/api-client";

export function SessionExerciseDetail({
  exercise,
  isOpen,
  onClose,
}: {
  exercise: PublicExercise | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !exercise) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-lg bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {exercise.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {exercise.difficulty}
                  {exercise.muscleGroups.length > 0 && (
                    <>
                      {" · "}
                      {exercise.muscleGroups.join(", ")}
                    </>
                  )}
                  {exercise.equipment.length > 0 && (
                    <>
                      {" · "}
                      {exercise.equipment.join(", ")}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-4">
              {/* Media */}
              {exercise.mediaUrl && (
                <div className="flex justify-center rounded-lg border border-border bg-muted overflow-hidden">
                  {exercise.mediaUrl.endsWith(".svg") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={exercise.mediaUrl}
                      alt={exercise.name}
                      className="w-full max-w-sm h-auto object-contain p-4"
                    />
                  ) : (
                    // Support GIF and other formats with plain img tag
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={exercise.mediaUrl}
                      alt={exercise.name}
                      className="w-full max-w-sm h-auto object-contain"
                      loading="lazy"
                    />
                  )}
                </div>
              )}

              {/* Cues */}
              {exercise.cues.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Como executar
                  </h3>
                  <ul className="space-y-1 text-sm text-foreground">
                    {exercise.cues.map((cue, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Mistakes */}
              {exercise.mistakes.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Erros comuns
                  </h3>
                  <ul className="space-y-1 text-sm text-foreground">
                    {exercise.mistakes.map((mistake, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-destructive font-bold mt-0.5">✕</span>
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Contraindications */}
              {exercise.contraindicationTags.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Contraindicações
                  </h3>
                  <div className="space-y-2">
                    {exercise.contraindicationTags.map((tag) => (
                      <div
                        key={tag.code}
                        className="rounded-md bg-warning/10 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-warning">
                          {tag.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {tag.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-muted/30 px-4 py-3">
              <button
                onClick={onClose}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
