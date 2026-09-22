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
