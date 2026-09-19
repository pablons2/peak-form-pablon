import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LinkInvitedBy, LinkStatus } from "@prisma/client";
import type {
  UserRepository,
  UserWithProfiles,
} from "../../../auth/domain/ports/user.repository.port";
import { USER_REPOSITORY } from "../../../auth/domain/ports/user.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";
import { linkStatusLabel } from "../../domain/labels";

// PRD 02 §5.2 — decline flow, counterpart of AcceptLinkUseCase. Only the
// recipient of a PENDING invite may decline it; the row becomes DECLINED
// (kept as history — nothing is deleted).
@Injectable()
export class DeclineLinkUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  async execute(input: { actor: UserWithProfiles; linkId: string }) {
    const link = await this.links.findById(input.linkId);
    if (!link) throw new NotFoundException("Link not found");

    const expected =
      link.invitedBy === LinkInvitedBy.PROFESSIONAL
        ? link.clientId
        : link.professionalId;
    if (input.actor.id !== expected) {
      throw new ForbiddenException(
        "Only the recipient of the invite can respond to it",
      );
    }

    if (link.status !== LinkStatus.PENDING) {
      throw new ConflictException(
        `Only a pending link can be declined (status: ${linkStatusLabel(link.status)})`,
      );
    }

    return this.links.update(link.id, { status: LinkStatus.DECLINED });
  }
}
