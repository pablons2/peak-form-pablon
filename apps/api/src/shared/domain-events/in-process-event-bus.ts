import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";
import type { DomainEvent, DomainEventBus } from "./domain-event-bus.port";

// In-process DomainEventBus implementation (base doc §7.2). Events are fanned
// out to synchronous subscribers via Node's EventEmitter and kept in `history`
// for observation. When PRD 12 lands, its dispatcher subscribes via `on()`;
// a distributed setup would swap this adapter without touching callers.
@Injectable()
export class InProcessEventBus implements DomainEventBus {
  private readonly emitter = new EventEmitter();
  readonly history: DomainEvent[] = [];

  emit(event: { name: string; payload: Record<string, unknown> }): void {
    const full: DomainEvent = { ...event, occurredAt: new Date() };
    this.history.push(full);
    this.emitter.emit(event.name, full);
  }

  on(name: string, handler: (event: DomainEvent) => void): void {
    this.emitter.on(name, handler);
  }
}
