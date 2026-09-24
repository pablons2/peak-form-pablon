import Link from "next/link";
import type { PublicSession, PublicTrainingPlan } from "../api-client";
import {
  TRAINING_PLAN_STATUS_BADGE_CLASS,
  TRAINING_PLAN_STATUS_LABELS,
  formatPlanStartDate,
  formatSessionDate,
} from "../labels";

/**
 * Single visual representation of a training plan, shared by the client's
 * /plans list and the professional's TrainingPlansTab (isEditable).
 *
 * PRD 06 §4/§7 — plan status and start date are always visible; the next
 * scheduled session is shown when the caller has that data.
 */
export function TrainingPlanCard({
  plan,
  nextSession,
  isEditable = false,
}: {
  plan: PublicTrainingPlan;
  nextSession?: PublicSession | null;
  isEditable?: boolean;
}) {
  const planHref = `/plans/${plan.id}`;
  const statusLabel = TRAINING_PLAN_STATUS_LABELS[plan.status] ?? plan.status;

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={planHref} className="font-medium text-foreground hover:underline">
          {plan.name}
        </Link>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            TRAINING_PLAN_STATUS_BADGE_CLASS[plan.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Início: {formatPlanStartDate(plan.startDate)}
      </p>

      {nextSession && (
        <p className="mt-1 text-sm text-muted-foreground">
          Próxima sessão: {formatSessionDate(nextSession.date)} —{" "}
          {nextSession.sessionExercises.length} exercício(s)
        </p>
      )}

      <div className="mt-3">
        <Link href={planHref} className="text-sm font-medium text-accent hover:underline">
          {isEditable ? "Abrir plano →" : "Ver treino →"}
        </Link>
      </div>
    </li>
  );
}
