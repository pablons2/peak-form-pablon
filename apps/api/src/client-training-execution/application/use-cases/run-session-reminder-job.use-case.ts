import { Inject, Injectable } from "@nestjs/common";
import {
  DOMAIN_EVENT_BUS,
  SESSION_REMINDER,
  type DomainEventBus,
  type SessionReminderPayload,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../../training-plans/domain/ports/session.repository.port";

// PRD 12 §5.1's "session reminder" trigger — emitted by
// SessionReminderJobService's per-minute tick for every still-SCHEDULED
// session dated today. Exactly-once-per-session is NOT enforced here:
// the notification dispatcher dedupes on `session:{sessionId}` (see
// notifications/domain/notification-types.ts), keeping this job a dumb
// producer the same way CheckInDueJob is — owning module owns *when*,
// NotificationsModule owns *whether it's already been delivered*.
@Injectable()
export class RunSessionReminderJobUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { now: Date }) {
    const today = new Date(
      Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()),
    );
    const sessions = await this.sessions.findScheduledOnDate(today);
    const reminded: string[] = [];
    for (const session of sessions) {
      const clientId = session.mesocycle.trainingPlan.clientId;
      // No recipient on a clientless (Starter Template) plan — skip.
      if (!clientId) continue;
      const payload: SessionReminderPayload = {
        sessionId: session.id,
        clientId,
        date: session.date.toISOString().slice(0, 10),
      };
      await this.events.emit({ name: SESSION_REMINDER, payload });
      reminded.push(session.id);
    }
    return { remindedCount: reminded.length, remindedSessionIds: reminded };
  }
}
