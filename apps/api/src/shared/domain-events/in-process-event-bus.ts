import { Injectable } from "@nestjs/common";
import type { DomainEvent, DomainEventBus } from "./domain-event-bus.port";

// In-process DomainEventBus implementation (base doc §7.2). Deliberately
// backed by a plain Map of handler arrays, not Node's EventEmitter: emit()
// needs to return a Promise that resolves only once every handler's async
// work has settled (Promise.all) — EventEmitter.emit() is fire-and-forget
// and returns before an async listener's own await chain finishes, which
// made PRD 11's cross-module thread-sync side effect racy against the HTTP
// response that triggered it. When PRD 12 lands, its dispatcher subscribes
// via on(); a distributed setup would swap this adapter without touching
// callers.
@Injectable()
export class InProcessEventBus implements DomainEventBus {
  private readonly handlers = new Map<
    string,
    Array<(event: DomainEvent) => void | Promise<void>>
  >();
  readonly history: DomainEvent[] = [];

  async emit(event: { name: string; payload: Record<string, unknown> }): Promise<void> {
    const full: DomainEvent = { ...event, occurredAt: new Date() };
    this.history.push(full);
    const listeners = this.handlers.get(event.name) ?? [];
    await Promise.all(listeners.map((handler) => handler(full)));
  }

  on(name: string, handler: (event: DomainEvent) => void | Promise<void>): void {
    const existing = this.handlers.get(name) ?? [];
    existing.push(handler);
    this.handlers.set(name, existing);
  }
}
