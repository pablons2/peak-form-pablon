import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
  type CheckInScheduleRepository,
} from "../../domain/ports/check-in-schedule.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";

// PRD 02 §4/§7 — viewing a link's check-in schedules. Both parties of the
// link may list them (the Client's access is read-only — no client-facing
// mutation endpoints exist); anyone else is denied.
@Injectable()
export class ListCheckInSchedulesUseCase {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(CHECK_IN_SCHEDULE_REPOSITORY)
    private readonly schedules: CheckInScheduleRepository,
  ) {}

  async execute(input: { viewerId: string; linkId: string }) {
    const link = await this.links.findById(input.linkId);
    if (!link) throw new NotFoundException("Link not found");
    if (
      input.viewerId !== link.professionalId &&
      input.viewerId !== link.clientId
    ) {
      throw new ForbiddenException(
        "Only the two parties of a link can view its check-ins",
      );
    }
    return this.schedules.listByLink(link.id);
  }
}
