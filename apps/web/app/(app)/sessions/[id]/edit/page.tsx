import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { searchExercises } from "@/features/exercises/api-client";
import { getSession } from "@/features/training-plans/api-client";
import { SessionExerciseForm } from "@/features/training-plans/components/session-exercise-form";

export const metadata = { title: "Editar Sessão — PeakForm" };

// PRD 06 §5.4 — one-off exercise edit for a single dated Session
// (Professional/Admin only — the route itself 403s a Client at the API,
// this page just doesn't offer the link to one).
export default async function EditSessionPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const accessToken = session.accessToken!;
  const [sessionResult, exercisesResult] = await Promise.all([
    getSession(accessToken, params.id),
    searchExercises(accessToken, {}),
  ]);
  if (!sessionResult.ok) notFound();

  const availableExercises = exercisesResult.ok
    ? exercisesResult.data.map((e) => ({ id: e.id, name: e.name }))
    : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Editar sessão — {sessionResult.data.date.slice(0, 10)}
        </h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>
      <SessionExerciseForm session={sessionResult.data} availableExercises={availableExercises} />
    </main>
  );
}
