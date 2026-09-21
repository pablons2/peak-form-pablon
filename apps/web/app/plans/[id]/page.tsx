import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { getTrainingPlan } from "@/features/training-plans/api-client";
import { MESOCYCLE_GOAL_LABELS, TRAINING_PLAN_STATUS_LABELS } from "@/features/training-plans/labels";

export const metadata = { title: "Plano de Treino — PeakForm" };

// PRD 06 §4/§5.2 — the plan root: mesocycles in order, each linking to its
// weekly-template editor (Professional/Admin) or read-only session list
// (Client). Works the same for a concrete plan and a Starter Template.
export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accessToken = session.accessToken!;
  const result = await getTrainingPlan(accessToken, params.id);
  if (!result.ok) notFound();
  const plan = result.data;

  const canEdit =
    session.user.role === "ADMIN" ||
    (session.user.role === "PROFESSIONAL" &&
      (plan.professionalId === session.user.id || plan.authoredById === session.user.id));

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{plan.name}</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        {plan.isStarterTemplate ? "Modelo inicial" : TRAINING_PLAN_STATUS_LABELS[plan.status] ?? plan.status}
        {" — início em "}
        {plan.startDate.slice(0, 10)}
      </p>

      {canEdit ? (
        <Link
          href={`/plans/${plan.id}/mesocycles/new`}
          className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Adicionar mesociclo
        </Link>
      ) : null}

      <section aria-label="Mesociclos">
        {plan.mesocycles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum mesociclo criado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {plan.mesocycles.map((mesocycle) => (
              <li key={mesocycle.id} className="rounded-lg border border-border bg-card p-4">
                <Link
                  href={`/plans/${plan.id}/mesocycles/${mesocycle.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  Bloco {mesocycle.order} — {MESOCYCLE_GOAL_LABELS[mesocycle.goal] ?? mesocycle.goal}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mesocycle.weeks} semana(s){mesocycle.isDeload ? " — deload" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
