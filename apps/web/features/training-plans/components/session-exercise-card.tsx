import Link from "next/link";
import type { PublicPrescriptionExercise } from "../api-client";

export function SessionExerciseCard({
  exercise,
  canEdit,
  sessionId,
}: {
  exercise: PublicPrescriptionExercise;
  canEdit: boolean;
  sessionId: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border p-3 hover:bg-muted/50 transition-colors">
      {/* Exercise Media */}
      {exercise.mediaUrl ? (
        <div className="shrink-0">
          <img
            src={exercise.mediaUrl}
            alt={exercise.exerciseName}
            loading="lazy"
            className="h-24 w-24 rounded-md border border-border/50 object-cover bg-muted"
          />
        </div>
      ) : (
        <div className="shrink-0 h-24 w-24 rounded-md border border-dashed border-border/50 bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground text-center px-2">Sem mídia</span>
        </div>
      )}

      {/* Exercise Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {exercise.exerciseName}
            </h3>
          </div>
        </div>
        <p className="text-sm font-medium text-accent mt-1">
          {exercise.targetSets}x{exercise.targetRepsMin}
          {exercise.targetRepsMax ? `-${exercise.targetRepsMax}` : ""}
        </p>
        {exercise.restSeconds && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Descanso: {exercise.restSeconds}s
          </p>
        )}
        {exercise.notes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {exercise.notes}
          </p>
        )}
      </div>
    </div>
  );
}
