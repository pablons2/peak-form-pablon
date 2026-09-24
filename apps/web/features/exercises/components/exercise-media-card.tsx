"use client";

import Image from "next/image";
import { Badge, Alert } from "@peakform/ui";
import type { PublicExercise } from "../api-client";
import { AlertTriangle } from "lucide-react";

export function ExerciseMediaCard({
  exercise,
  isContraindicated = false,
  className = "",
}: {
  exercise: PublicExercise;
  isContraindicated?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card overflow-hidden ${className}`}>
      {isContraindicated && (
        <Alert className="rounded-none border-0 border-b border-warning/40 bg-warning/10 m-0">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <p className="text-sm font-medium text-warning">Exercício contraindicado para este cliente</p>
        </Alert>
      )}

      <div className="space-y-4 p-4">
        {/* Media Display */}
        {exercise.mediaUrl && (
          <div className="flex justify-center bg-muted rounded-lg overflow-hidden min-h-[200px] w-full">
            {exercise.mediaUrl.endsWith(".svg") ? (
              <img
                src={exercise.mediaUrl}
                alt={exercise.name}
                className="w-full h-auto object-contain p-4"
              />
            ) : (
              <Image
                src={exercise.mediaUrl}
                alt={exercise.name}
                width={300}
                height={200}
                className="w-full h-auto object-contain"
              />
            )}
          </div>
        )}

        {/* Exercise Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-foreground text-lg">{exercise.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Dificuldade: <span className="font-medium text-foreground">{exercise.difficulty}</span>
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {exercise.muscleGroups.map((mg) => (
              <Badge key={mg} className="bg-primary/10 text-primary text-xs">
                {mg}
              </Badge>
            ))}
            {exercise.equipment.map((eq) => (
              <Badge key={eq} className="bg-accent/10 text-accent text-xs">
                {eq}
              </Badge>
            ))}
          </div>

          {/* Cues */}
          {exercise.cues.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground">Técnica:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {exercise.cues.map((cue, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {exercise.mistakes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground">Erros Comuns:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {exercise.mistakes.map((mistake, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-destructive font-bold">✕</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contraindication Tags */}
          {exercise.contraindicationTags.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground">Contraindicações:</p>
              <div className="flex flex-wrap gap-1">
                {exercise.contraindicationTags.map((tag) => (
                  <Badge
                    key={tag.code}
                    className="bg-warning/10 text-warning text-xs font-normal"
                    title={tag.description}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
