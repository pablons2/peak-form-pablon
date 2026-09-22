import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  MESSAGING_REPOSITORY,
  type MessageThreadWithParties,
  type MessagingRepository,
} from "../../domain/ports/messaging.repository.port";

export interface ThreadSummary {
  thread: MessageThreadWithParties;
  unreadCount: number;
}

// PRD 11 §7 — the caller's own inbox. Admin has no "own" threads (its
// read access is §4's "support" row, exercised one thread at a time via
// GetThreadUseCase, not a personal inbox) — deliberately not built here to
// avoid an unrequested admin support-chat surface (§3 Non-Goals).
@Injectable()
export class ListMyThreadsUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY) private readonly messaging: MessagingRepository,
  ) {}

  async execute(input: { viewer: { id: string; role: Role } }): Promise<ThreadSummary[]> {
    let threads: MessageThreadWithParties[];
    if (input.viewer.role === Role.PROFESSIONAL) {
      threads = await this.messaging.listThreadsForProfessional(input.viewer.id);
    } else if (input.viewer.role === Role.CLIENT) {
      threads = await this.messaging.listThreadsForClient(input.viewer.id);
    } else {
      throw new ForbiddenException("Admins don't have a personal message inbox");
    }

    return Promise.all(
      threads.map(async (thread) => ({
        thread,
        unreadCount: await this.messaging.countUnread(thread.id, input.viewer.id),
      })),
    );
  }
}
