import Link from "next/link";
import type { PublicTrainingPlan } from "../../training-plans/api-client";
import type { PublicSessionExecution } from "../../client-training-execution/api-client";
import { TRAINING_PLAN_STATUS_LABELS } from "../../training-plans/labels";

/**
 * Discovery card for Client: shows that they have training plans assigned.
 * Displays today's session if available.
 * Positioned prominently in dashboard so client discovers plans immediately.
 *
 * PRD 06 §4/§7 — Client's own plans, read-only
 * Redesign-plan §5.4 — Client detail hub context
 */
export function TrainingAssignmentCard({
  plans,
  todaySession,
}: {
  plans: PublicTrainingPlan[];
  todaySession?: PublicSessionExecution | null;
}) {
  if (plans.length === 0) {
    return null; // Don't show if no plans
  }

  // Get the first active plan (or any plan if all are draft)
  const activePlan = plans.find((p) => p.status === "ACTIVE") ?? plans[0];
  if (!activePlan) {
    return null;
  }

  const planStatus = TRAINING_PLAN_STATUS_LABELS[activePlan.status] || activePlan.status;

  return (
    <Link
      href="/plans"
      className="block rounded-lg border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
    >
      <div className="space-y-3">
        {/* Header: Status + Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Você tem {plans.length} plano{plans.length !== 1 ? "s" : ""} de treino
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
            {planStatus}
          </span>
        </div>

        {/* Plan name */}
        <div>
          <p className="text-sm font-medium text-foreground">{activePlan.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Início: {activePlan.startDate.slice(0, 10)}
          </p>
        </div>

        {/* Next session indicator */}
        {todaySession ? (
          <div className="rounded-md bg-primary/10 p-2">
            <p className="text-xs font-medium text-primary">
              📅 Próxima sessão: hoje
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {todaySession.exercises.length} exercício(s)
            </p>
          </div>
        ) : (
          <div className="rounded-md bg-muted p-2">
            <p className="text-xs text-muted-foreground">
              Próxima sessão agendada em breve
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2 pt-2">
          <button className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver meus treinos →
          </button>
        </div>
      </div>
    </Link>
  );
}
