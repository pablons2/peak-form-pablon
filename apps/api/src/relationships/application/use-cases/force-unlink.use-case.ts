import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LinkStatus } from "@prisma/client";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";
import {
  DOMAIN_EVENT_BUS,
  LINK_STATUS_CHANGED,
  type DomainEventBus,
  type LinkStatusChangedPayload,
} from "../../../shared/domain-events/domain-event-bus.port";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../domain/ports/check-in-schedule.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";

// PRD 02 §5.5 — Admin oversight. An Admin can force-unlink any relationship
// (dispute resolution, Professional deactivation cleanup from PRD 01 §5.5).
// Same side-effects as a party-initiated unlink: ACTIVE check-in schedules
// are cancelled and the decision is written to the shared audit log.
@Injectable()
export class ForceUnlinkUseCase {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
    private readonly auditLog: AuditLogService,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { adminId: string; linkId: string }) {
    const link = await this.links.findById(input.linkId);
    if (!link) throw new NotFoundException("Link not found");
    if (link.status === LinkStatus.UNLINKED) {
      throw new ConflictException("This relationship is already unlinked");
    }

    await this.schedules.cancelActiveForLink(link.id);

    const unlinked = await this.links.update(link.id, {
      status: LinkStatus.UNLINKED,
      unlinkedAt: new Date(),
      unlinkedById: input.adminId,
    });

    await this.auditLog.record({
      actorId: input.adminId,
      action: "LINK_FORCE_UNLINKED",
      entity: "ProfessionalClientLink",
      entityId: link.id,
      metadata: {
        professionalId: link.professionalId,
        clientId: link.clientId,
        specialization: link.specialization,
      },
    });

    // PRD 11 §5.3 — same read-only transition as a party-initiated unlink.
    const payload: LinkStatusChangedPayload = {
      linkId: unlinked.id,
      professionalId: unlinked.professionalId,
      clientId: unlinked.clientId,
      status: "UNLINKED",
    };
    await this.events.emit({ name: LINK_STATUS_CHANGED, payload });

    return unlinked;
  }
}
