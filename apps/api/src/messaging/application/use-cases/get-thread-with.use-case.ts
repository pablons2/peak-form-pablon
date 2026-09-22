import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  MESSAGING_REPOSITORY,
  type MessageThreadWithParties,
  type MessagingRepository,
} from "../../domain/ports/messaging.repository.port";

// Deep-link resolver: given "the other user's id", resolves the caller's
// own thread with them without the frontend needing to know whether it's
// keyed as (professionalId, clientId) in which order. Used by
// /clients/[linkId] (a Professional linking into a specific Client's
// thread) and /team (a Client linking into a specific Professional's
// thread) — both already have the *other party's* User id from their own
// link data, not a threadId. Returns null (not 404) when no thread exists
// yet — a link can be PENDING (never went ACTIVE) or brand new, and "no
// thread yet" is a normal, unexceptional state for a caller resolving this
// before ever having exchanged a message.
@Injectable()
export class GetThreadWithUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY) private readonly messaging: MessagingRepository,
  ) {}

  async execute(input: {
    actor: { id: string; role: Role };
    otherUserId: string;
  }): Promise<MessageThreadWithParties | null> {
    if (input.actor.role === Role.PROFESSIONAL) {
      return this.messaging.findThreadByPair(input.actor.id, input.otherUserId);
    }
    if (input.actor.role === Role.CLIENT) {
      return this.messaging.findThreadByPair(input.otherUserId, input.actor.id);
    }
    throw new ForbiddenException("Admins don't have a personal message inbox");
  }
}
