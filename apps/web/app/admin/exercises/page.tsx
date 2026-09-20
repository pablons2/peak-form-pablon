import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { adminListExercises } from "@/features/exercises/api-client";
import {
  AdminDeleteExerciseButton,
  PromoteExerciseButton,
} from "@/features/exercises/components/exercise-actions";
import {
  DIFFICULTY_LABELS,
  MUSCLE_GROUP_LABELS,
} from "@/features/exercises/labels";

export const metadata = { title: "Revisão de exercícios — PeakForm" };

// PRD 05 §5.3 — Admin review queue: every PRIVATE custom exercise a
// Professional authored, with the promote-to-global action (and removal for
// curation). §4: only Admins curate the shared library.
export default async function AdminExercisesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const result = await adminListExercises(session.accessToken!, "PRIVATE");
  const pending = result.ok ? result.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Revisão de exercícios personalizados
        </h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Exercícios criados por profissionais, visíveis apenas para eles e seus
        alunos. Promova para tornar um exercício parte da biblioteca global.
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum exercício personalizado aguardando revisão.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((exercise) => (
            <li
              key={exercise.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/exercises/${exercise.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {exercise.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {DIFFICULTY_LABELS[exercise.difficulty] ??
                      exercise.difficulty}
                    {" · "}
                    {exercise.muscleGroups
                      .map((m) => MUSCLE_GROUP_LABELS[m] ?? m)
                      .join(", ")}
                  </p>
                  {exercise.owner ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      por {exercise.owner.fullName} ({exercise.owner.email})
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PromoteExerciseButton exerciseId={exercise.id} />
                  <AdminDeleteExerciseButton exerciseId={exercise.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
