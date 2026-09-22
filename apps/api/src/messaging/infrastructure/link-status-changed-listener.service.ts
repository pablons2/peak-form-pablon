import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  DOMAIN_EVENT_BUS,
  LINK_STATUS_CHANGED,
  type DomainEvent,
  type DomainEventBus,
  type LinkStatusChangedPayload,
} from "../../shared/domain-events/domain-event-bus.port";
import { SyncThreadOnLinkStatusChangedUseCase } from "../application/use-cases/sync-thread-on-link-status-changed.use-case";

// PRD 11 §5.1/§5.3 — subscribes to RelationshipsModule's LINK_STATUS_CHANGED
// event (Infrastructure-layer, same shape as PRD 02's CheckInDueJobService:
// a thin adapter around the actual Application use-case). The handler is
// awaited by InProcessEventBus.emit()'s Promise.all, so the caller who
// triggered the link-status change (AcceptLinkUseCase/UnlinkUseCase/
// ForceUnlinkUseCase) only gets its HTTP response after this has run — but
// a failure here must never fail *that* action, so it's caught and logged,
// not rethrown.
@Injectable()
export class LinkStatusChangedListener implements OnModuleInit {
  private readonly logger = new Logger(LinkStatusChangedListener.name);

  constructor(
    @Inject(DOMAIN_EVENT_BUS) private readonly bus: DomainEventBus,
    private readonly syncThread: SyncThreadOnLinkStatusChangedUseCase,
  ) {}

  onModuleInit(): void {
    this.bus.on(LINK_STATUS_CHANGED, async (event: DomainEvent) => {
      const payload = event.payload as unknown as LinkStatusChangedPayload;
      try {
        await this.syncThread.execute(payload);
      } catch (err) {
        this.logger.error(
          "Failed to sync message thread on link status change",
          err instanceof Error ? err.stack : String(err),
        );
      }
    });
  }
}
