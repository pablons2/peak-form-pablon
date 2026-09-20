import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { listContraindicationTags } from "@/features/exercises/api-client";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";

export const metadata = { title: "Novo exercício — PeakForm" };

// PRD 05 §5.3 — custom-exercise authoring, Professional-only in the UI
// (Admins author through the same form; the API allows both roles per §4).
export default async function NewExercisePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/exercises");
  if (session.user.approvalStatus === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }

  const tagsResult = await listContraindicationTags(session.accessToken!);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Novo exercício personalizado
        </h1>
        <Link
          href="/exercises"
          className="text-sm text-accent hover:underline"
        >
          Voltar
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Exercícios personalizados ficam visíveis apenas para você e seus alunos
        vinculados. Um administrador pode promovê-los à biblioteca global.
      </p>
      <ExerciseForm contraindicationTags={tagsResult.ok ? tagsResult.data : []} />
    </main>
  );
}
