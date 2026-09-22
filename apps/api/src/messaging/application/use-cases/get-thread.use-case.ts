import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Role, type Message } from "@prisma/client";
import {
  MESSAGING_REPOSITORY,
  type MessageThreadWithParties,
  type MessagingRepository,
} from "../../domain/ports/messaging.repository.port";
import { MessagingAccess } from "../messaging-access.service";

// PRD 11 §5.2 — fetches one thread's full history for a party (or Admin,
// read-only support). Viewing marks every message from the *other* party as
// read — the standard "opening a chat reads it" behavior — except for an
// Admin viewer, whose support access must never mutate the two real
// parties' own unread state.
@Injectable()
export class GetThreadUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY) private readonly messaging: MessagingRepository,
    private readonly access: MessagingAccess,
  ) {}

  async execute(input: {
    viewer: { id: string; role: Role };
    threadId: string;
  }): Promise<{ thread: MessageThreadWithParties; messages: Message[] }> {
    const thread = await this.messaging.findThreadById(input.threadId);
    if (!thread) throw new NotFoundException("Thread not found");

    this.access.assertCanRead(thread, input.viewer);

    if (input.viewer.role !== Role.ADMIN) {
      await this.messaging.markReadForRecipient(thread.id, input.viewer.id);
    }

    const messages = await this.messaging.listMessages(thread.id);
    return { thread, messages };
  }
}
