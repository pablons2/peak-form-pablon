import { Inject, Injectable } from "@nestjs/common";
import { MessageThreadStatus } from "@prisma/client";
import type { LinkStatusChangedPayload } from "../../../shared/domain-events/domain-event-bus.port";
import {
  MESSAGING_REPOSITORY,
  type MessagingRepository,
} from "../../domain/ports/messaging.repository.port";

// PRD 11 §5.1/§5.3 — reacts to RelationshipsModule's LINK_STATUS_CHANGED
// event, which only ever fires on these two transitions (PENDING/DECLINED/
// EXPIRED never had a thread to react to in the first place — see the
// payload type). ACTIVE creates (or reuses, if this pair's thread already
// existed from a prior relationship cycle) an ACTIVE thread; UNLINKED flips
// it to READ_ONLY. Never deletes a thread.
@Injectable()
export class SyncThreadOnLinkStatusChangedUseCase {
  constructor(
    @Inject(MESSAGING_REPOSITORY) private readonly messaging: MessagingRepository,
  ) {}

  async execute(payload: LinkStatusChangedPayload): Promise<void> {
    const status =
      payload.status === "ACTIVE"
        ? MessageThreadStatus.ACTIVE
        : MessageThreadStatus.READ_ONLY;
    await this.messaging.upsertThreadForPair(
      payload.professionalId,
      payload.clientId,
      status,
    );
  }
}
