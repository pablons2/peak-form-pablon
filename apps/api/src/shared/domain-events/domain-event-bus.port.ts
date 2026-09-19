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
  emit(event: { name: string; payload: Record<string, unknown> }): void;
  on(name: string, handler: (event: DomainEvent) => void): void;

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
