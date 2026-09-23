import Link from "next/link";
import type { PublicTrainingPlan } from "@/features/training-plans/api-client";
import { TRAINING_PLAN_STATUS_LABELS } from "@/features/training-plans/labels";

export function TrainingPlansTab({
  linkId,
  plans,
}: {
  linkId: string;
  plans: PublicTrainingPlan[];
}) {
  return (
    <div className="space-y-4">
      <Link
        href={`/clients/${linkId}/plans/new`}
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

      <p className="mt-6 pt-4 border-t border-border">
        <Link href={`/clients/${linkId}/plans`} className="text-accent hover:underline text-sm">
          Ver todos os planos →
        </Link>
      </p>
    </div>
  );
}
