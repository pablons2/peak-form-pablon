import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyTrainingPlans } from "@/features/training-plans/api-client";
import { TrainingPlanCard } from "@/features/training-plans/components/training-plan-card";

export const metadata = { title: "Meus Planos — PeakForm" };

// PRD 06 §4/§7 — a Client's own plans, read-only. Professionals manage
// plans through their client list (/clients/[linkId]/plans) instead.
export default async function MyPlansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const result = await listMyTrainingPlans(accessToken);
  const plans = result.ok ? result.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Meus planos</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <p className="text-sm">
        <Link href="/plans/starter-templates" className="text-accent hover:underline">
          Ver modelos iniciais →
        </Link>
      </p>

      {plans.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-foreground">
            Nenhum plano de treino atribuído ainda.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu profissional pode criar um plano para você — enquanto isso, você pode{" "}
            <Link href="/plans/starter-templates" className="text-accent hover:underline">
              começar com um modelo inicial →
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <TrainingPlanCard key={plan.id} plan={plan} />
          ))}
        </ul>
      )}
    </main>
  );
}
