import { TrainingPlanStatus } from "@prisma/client";
import {
  PLAN_UPDATED,
  type DomainEventBus,
  type PlanUpdatedPayload,
} from "../../shared/domain-events/domain-event-bus.port";

// PRD 12 §5.1 — "plan updated" for the Client-facing trigger. Emitted by
// every use-case that mutates what a Client sees on a plan, gated to
// ACTIVE plans only: a DRAFT (or Starter Template, which has no clientId
// at all) is invisible to the Client, so an edit to one notifies no one.
// Same-day repeat edits collapse into a single notification via the
// dispatcher's `plan:{id}:{date}` dedupe key — the non-spammy rule (§2) is
// enforced there, not here.
export async function emitPlanUpdated(
  events: DomainEventBus,
  plan: {
    id: string;
    clientId: string | null;
    professionalId: string | null;
    status: TrainingPlanStatus;
  },
  actorId: string,
): Promise<void> {
  if (!plan.clientId || plan.status !== TrainingPlanStatus.ACTIVE) return;
  const payload: PlanUpdatedPayload = {
    planKind: "TRAINING",
    planId: plan.id,
    clientId: plan.clientId,
    professionalId: plan.professionalId ?? actorId,
    date: new Date().toISOString().slice(0, 10),
  };
  await events.emit({ name: PLAN_UPDATED, payload });
}
