import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { searchExercises } from "@/features/exercises/api-client";
import { getSession } from "@/features/training-plans/api-client";
import { getClientIntake } from "@/features/relationships/api-client";
import { SessionExerciseForm } from "@/features/training-plans/components/session-exercise-form";

export const metadata = { title: "Editar Sessão — PeakForm" };

// PRD 06 §5.4 — one-off exercise edit for a single dated Session
// (Professional/Admin only — the route itself 403s a Client at the API,
// this page just doesn't offer the link to one).
// Phase 3.1 enhancement: fetch exercise details + client intake for
// contraindication filtering in ExerciseSelectorWithPreview.
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

  // Phase 3.1: Fetch client intake for contraindication filtering
  const clientId = sessionResult.data.clientId;
  const intakeResult = clientId ? await getClientIntake(accessToken, clientId) : null;
  const intake = intakeResult?.ok ? intakeResult.data.intake : null;

  const availableExercises = exercisesResult.ok
    ? exercisesResult.data.map((e) => ({ id: e.id, name: e.name }))
    : [];

  // Phase 3.1: Build exercise details map for ExerciseSelectorWithPreview
  const exerciseDetails: Record<string, any> = {};
  if (exercisesResult.ok) {
    exercisesResult.data.forEach((e) => {
      exerciseDetails[e.id] = e;
    });
  }

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
      <SessionExerciseForm
        session={sessionResult.data}
        availableExercises={availableExercises}
        exerciseDetails={exerciseDetails}
        clientIntake={intake}
      />
    </main>
  );
}
