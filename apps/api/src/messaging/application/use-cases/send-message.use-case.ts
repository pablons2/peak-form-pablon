import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Message, Role } from "@prisma/client";
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
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    threadId: string;
    body: string;
  }): Promise<Message> {
    const thread = await this.messaging.findThreadById(input.threadId);
    if (!thread) throw new NotFoundException("Thread not found");

    this.access.assertCanWrite(thread, input.actor);

    return this.messaging.createMessage(thread.id, input.actor.id, input.body);
  }
}
