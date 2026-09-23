import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LinkStatus } from "@prisma/client";
import { MAILER } from "../../../notifications/domain/ports/mailer.port";
import type { Mailer } from "../../../notifications/domain/ports/mailer.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../../auth/domain/ports/user.repository.port";
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
import { linkStatusLabel } from "../../domain/labels";

// PRD 02 §5.4 — unlink. Either party can unlink an ACTIVE relationship:
//   - status → UNLINKED with a timestamp and the initiating party;
//   - the Client's historical plans/logs are NOT deleted (those tables belong
//     to later PRDs; the link row itself is also never deleted, so the
//     relationship history stays readable);
//   - any ACTIVE CheckInSchedule tied to the link is cancelled (§5.6);
//   - the other party is notified.
@Injectable()
export class UnlinkUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(DOMAIN_EVENT_BUS) private readonly events: DomainEventBus,
  ) {}

  async execute(input: { actorId: string; linkId: string }) {
    const link = await this.links.findById(input.linkId);
    if (!link) throw new NotFoundException("Link not found");

    if (
      input.actorId !== link.professionalId &&
      input.actorId !== link.clientId
    ) {
      throw new ForbiddenException(
        "Only one of the two parties can unlink this relationship",
      );
    }
    if (link.status !== LinkStatus.ACTIVE) {
      throw new ConflictException(
        `Only an active relationship can be unlinked (status: ${linkStatusLabel(link.status)})`,
      );
    }

    await this.schedules.cancelActiveForLink(link.id);

    const unlinked = await this.links.update(link.id, {
      status: LinkStatus.UNLINKED,
      unlinkedAt: new Date(),
      unlinkedById: input.actorId,
    });

    // PRD 11 §5.3 — the pair's MessageThread becomes read-only, history
    // preserved. Awaited for the same determinism reason as AcceptLinkUseCase.
    const payload: LinkStatusChangedPayload = {
      linkId: unlinked.id,
      professionalId: unlinked.professionalId,
      clientId: unlinked.clientId,
      status: "UNLINKED",
    };
    await this.events.emit({ name: LINK_STATUS_CHANGED, payload });

    const initiator =
      input.actorId === link.professionalId
        ? link.professional.fullName
        : link.client.fullName;
    const other =
      input.actorId === link.professionalId ? link.client : link.professional;
    await this.mailer.send({
      to: other.email,
      subject: "PeakForm — a working relationship ended",
      text: `${initiator} ended the working relationship on PeakForm. Shared history remains available read-only.`,
    });

    return unlinked;
  }
}
