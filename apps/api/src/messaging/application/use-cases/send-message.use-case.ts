import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Message, Role } from "@prisma/client";
import {
  DOMAIN_EVENT_BUS,
  NEW_MESSAGE,
  type DomainEventBus,
  type NewMessagePayload,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  MESSAGING_REPOSITORY,
  type MessagingRepository,
} from "../../domain/ports/messaging.repository.port";
import { MessagingAccess } from "../messaging-access.service";

// PRD 11 §5.2/§5.3 — sends a plain-text message. Rejected on a READ_ONLY
// thread (§5.3 — history preserved, no new writes) and on any non-party
// (§10 AC, enforced server-side).
@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY) private readonly messaging: MessagingRepository,
    private readonly access: MessagingAccess,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    threadId: string;
    body: string;
  }): Promise<Message> {
    const thread = await this.messaging.findThreadById(input.threadId);
    if (!thread) throw new NotFoundException("Thread not found");

    this.access.assertCanWrite(thread, input.actor);

    const message = await this.messaging.createMessage(
      thread.id,
      input.actor.id,
      input.body,
    );

    // PRD 12 §5.1 — "new message" notifies whichever party didn't send it.
    // Awaited so the Notification row genuinely exists before the HTTP
    // response (see the bus port's comment on why emit() resolves late).
    const recipientId =
      thread.professionalId === input.actor.id
        ? thread.clientId
        : thread.professionalId;
    const payload: NewMessagePayload = {
      messageId: message.id,
      threadId: thread.id,
      senderId: input.actor.id,
      recipientId,
      preview: input.body.slice(0, 120),
    };
    await this.events.emit({ name: NEW_MESSAGE, payload });

    return message;
  }
}
