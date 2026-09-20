import type { PublicExercise } from "../api-client";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
} from "../labels";

// PRD 05 §7 — the single exercise detail view, reused identically by the
// library page and (later) PRD 06's exercise picker so "how it's authored"
// and "how it's consumed" can never diverge. Server component; the parent
// decides which actions (edit/promote/assign) to render alongside it.
export function ExerciseDetail({ exercise }: { exercise: PublicExercise }) {
  return (
    <article className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {exercise.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty}
            {" · "}
            {exercise.muscleGroups
              .map((m) => MUSCLE_GROUP_LABELS[m] ?? m)
              .join(", ")}
            {" · "}
            {exercise.equipment
              .map((e) => EQUIPMENT_LABELS[e] ?? e)
              .join(", ")}
          </p>
        </div>
        {exercise.visibility === "PRIVATE" ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Privado
          </span>
        ) : null}
      </div>

      {exercise.mediaUrl ? (
        // Plain <img>: media URLs come from the app's own object storage and
        // must lazy-load (§7) — next/image would need remote-pattern config
        // per storage host without buying much for animated GIFs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={exercise.mediaUrl}
          alt={`Demonstração do exercício ${exercise.name}`}
          loading="lazy"
          className="mx-auto w-full max-w-sm rounded-lg border border-border bg-muted"
        />
      ) : null}

      <section>
        <h2 className="text-sm font-medium text-foreground">
          Como executar
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
          {exercise.cues.map((cue, i) => (
            <li key={i}>{cue}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">
          Erros comuns
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
          {exercise.mistakes.map((mistake, i) => (
            <li key={i}>{mistake}</li>
          ))}
        </ul>
      </section>

      {exercise.contraindicationTags.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-foreground">
            Contraindicações
          </h2>
          <ul className="mt-2 space-y-2">
            {exercise.contraindicationTags.map((tag) => (
              <li
                key={tag.code}
                className="rounded-md bg-destructive/10 px-3 py-2"
              >
                <p className="text-sm font-medium text-destructive">
                  {tag.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tag.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {exercise.owner ? (
        <p className="text-xs text-muted-foreground">
          Criado por {exercise.owner.fullName}
        </p>
      ) : null}
    </article>
  );
}
