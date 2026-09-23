import Link from "next/link";
import type { PublicTrainingPlan } from "@/features/training-plans/api-client";
import type { ClientIntake } from "@/features/relationships/api-client";
import { TRAINING_PLAN_STATUS_LABELS } from "@/features/training-plans/labels";
import { Lock, AlertCircle } from "lucide-react";

export function TrainingPlansTab({
  linkId,
  plans,
  intake,
}: {
  linkId: string;
  plans: PublicTrainingPlan[];
  intake?: ClientIntake | null;
}) {
  const intakePending = !intake;
  const canCreatePlans = !!intake;
  return (
    <div className="space-y-4">
      {intakePending && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Triagem de saúde necessária</h3>
              <p className="mt-1 text-sm text-foreground">
                Antes de criar um plano de treino, é necessário que o cliente complete a triagem de saúde.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Status: <span className="font-medium">⏳ Aguardando resposta</span>
              </p>
              <Link
                href={`/clients/${linkId}/intake`}
                className="inline-block mt-3 text-accent hover:underline text-sm font-medium"
              >
                Ver status da triagem →
              </Link>
            </div>
          </div>
        </div>
      )}

      {canCreatePlans && (
        <Link
          href={`/clients/${linkId}/plans/new`}
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

      <p className="mt-6 pt-4 border-t border-border">
        <Link href={`/clients/${linkId}/plans`} className="text-accent hover:underline text-sm">
          Ver todos os planos →
        </Link>
      </p>
    </div>
  );
}
