import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks, getClientIntake } from "@/features/relationships/api-client";
import { listClientTrainingPlans } from "@/features/training-plans/api-client";
import { TRAINING_PLAN_STATUS_LABELS } from "@/features/training-plans/labels";
import { Lock, AlertTriangle } from "lucide-react";

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

  const [plansResult, intakeResult] = await Promise.all([
    listClientTrainingPlans(accessToken, link.client.id),
    getClientIntake(accessToken, link.client.id),
  ]);
  const plans = plansResult.ok ? plansResult.data : [];
  const intake = intakeResult.ok ? intakeResult.data.intake : null;
  const intakePending = !intake;

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

      {intakePending ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">🔒 Triagem de saúde necessária</h2>
              <p className="mt-1 text-sm text-foreground">
                Antes de criar um plano de treino, é necessário que o cliente complete a triagem de saúde.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Status: <span className="font-medium">⏳ Aguardando resposta do cliente</span>
              </p>
              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium">Próximos passos:</span>
              </p>
              <ol className="mt-2 text-sm text-foreground list-decimal list-inside space-y-1">
                <li>Certifique-se de que o cliente recebeu o link de triagem</li>
                <li>Peça ao cliente para completar a triagem de saúde</li>
                <li>Após conclusão, você poderá criar planos personalizados</li>
              </ol>
              <Link
                href={`/clients/${link.id}/intake`}
                className="inline-block mt-4 text-accent hover:underline text-sm font-medium"
              >
                Ver status da triagem →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={`/clients/${link.id}/plans/new`}
          className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Criar plano
        </Link>
      )}

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
