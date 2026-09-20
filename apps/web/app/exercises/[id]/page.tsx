import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getExercise } from "@/features/exercises/api-client";
import { ExerciseDetail } from "@/features/exercises/components/exercise-detail";
import { DeleteExerciseButton } from "@/features/exercises/components/exercise-actions";

export const metadata = { title: "Exercício — PeakForm" };

// PRD 05 §7 — exercise detail. Edit/delete controls render only for the
// owner of a PRIVATE custom (or an Admin); the API re-checks authorization.
export default async function ExercisePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const result = await getExercise(session.accessToken!, params.id);
  if (!result.ok) notFound();
  const exercise = result.data;

  const canEdit =
    exercise.visibility === "PRIVATE" &&
    (exercise.ownerProfessionalId === session.user.id ||
      session.user.role === "ADMIN");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <Link href="/exercises" className="text-sm text-accent hover:underline">
        ← Voltar à biblioteca
      </Link>

      {canEdit ? (
        <div className="flex items-center gap-2">
          <Link
            href={`/exercises/${exercise.id}/edit`}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Editar
          </Link>
          <DeleteExerciseButton exerciseId={exercise.id} />
        </div>
      ) : null}

      <ExerciseDetail exercise={exercise} />
    </main>
  );
}
