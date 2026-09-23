import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import { listClientTrainingPlans } from "@/features/training-plans/api-client";
import { TRAINING_PLAN_STATUS_LABELS } from "@/features/training-plans/labels";

export const metadata = { title: "Planos de Treino — PeakForm" };

// PRD 06 §4/§7 — a Professional's plans for one specific linked Client.
// Same "filter the caller's own links list" access pattern as
// /clients/[linkId] (PRD 02) — no dedicated GET /links/:id exists.
export default async function ClientPlansPage({
  params,
}: {
  params: { linkId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/dashboard");
  if (session.user.approvalStatus !== "APPROVED") redirect("/pending-approval");

  const accessToken = session.accessToken!;
  const linksResult = await listMyLinks(accessToken);
  const link = linksResult.ok
    ? linksResult.data.find((l) => l.id === params.linkId)
    : undefined;
  if (!link) notFound();

  const plansResult = await listClientTrainingPlans(accessToken, link.client.id);
  const plans = plansResult.ok ? plansResult.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Planos de {link.client.fullName}
        </h1>
        <Link href={`/clients/${link.id}`} className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <Link
        href={`/clients/${link.id}/plans/new`}
        className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Criar plano
      </Link>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum plano de treino criado ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-lg border border-border bg-card p-4">
              <Link
                href={`/plans/${plan.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {plan.name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {TRAINING_PLAN_STATUS_LABELS[plan.status] ?? plan.status} — início em{" "}
                {plan.startDate.slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
