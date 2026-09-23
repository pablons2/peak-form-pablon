import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import {
  getExercise,
  listContraindicationTags,
} from "@/features/exercises/api-client";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";

export const metadata = { title: "Editar exercício — PeakForm" };

// Edit of a PRIVATE custom exercise — the API enforces ownership; here we
// just don't render a form the caller would only be rejected by anyway.
export default async function EditExercisePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/exercises");

  const accessToken = session.accessToken!;
  const [exerciseResult, tagsResult] = await Promise.all([
    getExercise(accessToken, params.id),
    listContraindicationTags(accessToken),
  ]);
  if (!exerciseResult.ok) notFound();
  const exercise = exerciseResult.data;

  const isOwner = exercise.ownerProfessionalId === session.user.id;
  const editable =
    exercise.visibility === "PRIVATE" &&
    (isOwner || session.user.role === "ADMIN");
  if (!editable) redirect(`/exercises/${exercise.id}`);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Editar exercício
        </h1>
        <Link
          href={`/exercises/${exercise.id}`}
          className="text-sm text-accent hover:underline"
        >
          Voltar
        </Link>
      </div>
      <ExerciseForm
        exercise={exercise}
        contraindicationTags={tagsResult.ok ? tagsResult.data : []}
      />
    </main>
  );
}
