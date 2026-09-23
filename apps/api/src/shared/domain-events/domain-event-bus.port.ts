// Domain-event bus port (base doc §7.2 — Infrastructure implements, the
// Application layer depends only on this interface). PRD 02 §5.6's firing job
// emits CHECK_IN_DUE here; PRD 12's Notification dispatcher is the consumer.
// This module never talks to email/push channels directly — it only produces
// domain events, keeping delivery concerns in PRD 12.
export const DOMAIN_EVENT_BUS = Symbol("DOMAIN_EVENT_BUS");

export interface DomainEvent {
  name: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface DomainEventBus {
  /// Resolves once every registered handler for this event name has
  /// settled (Promise.all), not just once they've been synchronously
  /// invoked. PRD 11 §5.1/§5.3 needs this: a Client/Professional action
  /// (accepting an invite, unlinking) must have its cross-module side
  /// effect (syncing a MessageThread) durably written before the HTTP
  /// response is sent, or BDD assertions racing the fire-and-forget
  /// version would be flaky by construction, not by a bug. A handler that
  /// throws is caught by Promise.all's rejection — callers that must not
  /// fail the original action on a subscriber's error should catch inside
  /// their own handler (see LinkStatusChangedListener).
  emit(event: { name: string; payload: Record<string, unknown> }): Promise<void>;
  on(name: string, handler: (event: DomainEvent) => void | Promise<void>): void;

  /// In-process record of everything emitted, in order. Lets PRD 12's
  /// dispatcher (and tests) observe events without wiring a real transport.
  readonly history: DomainEvent[];
}

export const CHECK_IN_DUE = "CHECK_IN_DUE";

// A type alias (not an interface) so it keeps an implicit index signature and
// stays assignable to the bus's Record<string, unknown> payload parameter.
export type CheckInDuePayload = {
  scheduleId: string;
  linkId: string;
  professionalId: string;
  clientId: string;
  specialization: string;
  dueAt: Date;
  note: string | null;
}

// PRD 11 §5.1/§5.3 — emitted by RelationshipsModule's link-mutating
// use-cases (AcceptLinkUseCase on ACTIVE, UnlinkUseCase/ForceUnlinkUseCase
// on UNLINKED) whenever a ProfessionalClientLink's status changes to one of
// these two. MessagingModule is the only consumer today (syncs/creates the
// pair's MessageThread) — RelationshipsModule has no dependency on
// MessagingModule at all, only on this shared port, keeping the two modules
// decoupled the same way PRD 02/PRD 12 are via CHECK_IN_DUE.
export const LINK_STATUS_CHANGED = "LINK_STATUS_CHANGED";

export type LinkStatusChangedPayload = {
  linkId: string;
  professionalId: string;
  clientId: string;
  status: "ACTIVE" | "UNLINKED";
}

// ---------------------------------------------------------------------------
// PRD 12 §5.1 — the remaining preference-eligible triggers. Same convention
// as CHECK_IN_DUE/LINK_STATUS_CHANGED: the owning module decides *when* and
// emits ids + minimal context; NotificationsModule's dispatcher decides
// *who gets told* (recipient resolution lives in its listener — see
// notifications/infrastructure/notification-event-listener.service.ts) and
// *how they're told* (Notification row + email/push fan-out). Payloads
// deliberately carry plain strings/ids only — no ORM rows across the seam.
// ---------------------------------------------------------------------------

/// PRD 07/PRD 12 §5.1 — a SCHEDULED session on today's date. Emitted by
/// client-training-execution's SessionReminderJob (per-tick, once per
/// session — the dispatcher dedupes on sessionId).
export const SESSION_REMINDER = "SESSION_REMINDER";

export type SessionReminderPayload = {
  sessionId: string;
  clientId: string;
  /// ISO "YYYY-MM-DD" — the session's calendar date.
  date: string;
};

/// PRD 07 §5.4/PRD 12 §5.1 — the missed-session job flagged a still-
/// SCHEDULED past-due session with zero logged sets as MISSED.
export const MISSED_SESSION = "MISSED_SESSION";

export type MissedSessionPayload = {
  sessionId: string;
  clientId: string;
  date: string;
};

/// PRD 08/PRD 12 §5.1 — a Client with an ACTIVE NutritionPlan logged zero
/// FoodDiaryEntries yesterday (checked so the reminder never fires while
/// the day is still in progress).
export const MISSED_FOOD_LOG = "MISSED_FOOD_LOG";

export type MissedFoodLogPayload = {
  clientId: string;
  /// ISO "YYYY-MM-DD" — the day that went unlogged.
  date: string;
};

/// PRD 11 §5.4/PRD 12 §5.1 — a Message landed in a thread; the recipient is
/// whichever party didn't send it.
export const NEW_MESSAGE = "NEW_MESSAGE";

export type NewMessagePayload = {
  messageId: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  /// First ~120 chars of the body — enough for the in-app list/email
  /// snippet without copying the whole message into the event.
  preview: string;
};

/// PRD 06/PRD 08/PRD 12 §5.1 — a Professional changed something on a plan
/// the Client can see. Only emitted for plans that are ACTIVE (or being
/// activated) with a clientId — Starter Templates and drafts notify no one.
export const PLAN_UPDATED = "PLAN_UPDATED";

export type PlanUpdatedPayload = {
  planKind: "TRAINING" | "NUTRITION";
  planId: string;
  clientId: string;
  professionalId: string;
  /// ISO "YYYY-MM-DD" — the edit day; the dispatcher folds it into the
  /// dedupe key so repeated same-day edits stay one notification (§2).
  date: string;
};

/// PRD 09 §5.2/PRD 12 §5.1 — the weekly summary for `weekStart` is ready.
/// One event per client; `professionalIds` are the client's ACTIVE links'
/// professionals, who §5.1 says are also recipients.
export const WEEKLY_SUMMARY_READY = "WEEKLY_SUMMARY_READY";

export type WeeklySummaryReadyPayload = {
  clientId: string;
  professionalIds: string[];
  /// ISO "YYYY-MM-DD" — the week the summary covers.
  weekStart: string;
};

/// PRD 01 §5.6/PRD 12 §5.1 — an Admin approved or rejected a professional
/// account. Account-critical among the preference-eligible triggers: the
/// email channel is server-side non-disableable (§5.3).
export const APPROVAL_DECISION = "APPROVAL_DECISION";

export type ApprovalDecisionPayload = {
  professionalUserId: string;
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
};
