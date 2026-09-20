import Link from "next/link";
import type { PublicExercise } from "../api-client";
import {
  DIFFICULTY_LABELS,
  MUSCLE_GROUP_LABELS,
} from "../labels";

// Library list item — name, difficulty, primary muscle groups, and a
// "Privado" marker on custom exercises (PRD 05 §5.3).
export function ExerciseCard({ exercise }: { exercise: PublicExercise }) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/exercises/${exercise.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {exercise.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {exercise.muscleGroups
              .map((m) => MUSCLE_GROUP_LABELS[m] ?? m)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {exercise.visibility === "PRIVATE" ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Privado
            </span>
          ) : null}
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            {DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty}
          </span>
        </div>
      </div>
    </li>
  );
}
