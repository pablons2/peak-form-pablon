import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LinkInvitedBy,
  LinkStatus,
  Specialization,
} from "@prisma/client";
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserWithProfiles,
} from "../../../auth/domain/ports/user.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
  type LinkWithParties,
} from "../../domain/ports/link.repository.port";
import { linkStatusLabel } from "../../domain/labels";

// PRD 02 §5.2 — accept flow, responding to a PENDING link. The invite IS
// the PENDING link row; acceptance flips it straight to ACTIVE (no separate
// ACCEPTED status per §5.1). Only the counterpart of whoever sent the
// invite may respond. The one-PT-one-Nutritionist constraint (§5.3) is
// enforced here in the Application layer, right before activation.
@Injectable()
export class AcceptLinkUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  async execute(input: { actor: UserWithProfiles; linkId: string }) {
    const link = await this.links.findById(input.linkId);
    if (!link) throw new NotFoundException("Link not found");

    this.assertCounterpart(link, input.actor);

    // §5.1 — a PENDING invite auto-expires after 30 days.
    if (
      link.status === LinkStatus.PENDING &&
      link.expiresAt &&
      link.expiresAt.getTime() <= Date.now()
    ) {
      await this.links.update(link.id, {
        status: LinkStatus.EXPIRED,
        expiresAt: null,
      });
      throw new ConflictException("This invite has expired");
    }

    if (link.status !== LinkStatus.PENDING) {
      throw new ConflictException(
        `Only a pending link can be accepted (status: ${linkStatusLabel(link.status)})`,
      );
    }

    // §5.3 — at most one ACTIVE link per (client, specialization).
    const active = await this.links.findActiveForClient(
      link.clientId,
      link.specialization,
    );
    if (active) {
      throw new ConflictException(
        active.specialization === Specialization.PERSONAL_TRAINER
          ? "You already have an active trainer — unlink first"
          : "You already have an active nutritionist — unlink first",
      );
    }

    return this.links.update(link.id, {
      status: LinkStatus.ACTIVE,
      linkedAt: new Date(),
      expiresAt: null,
    });
  }

  private assertCounterpart(link: LinkWithParties, actor: UserWithProfiles): void {
    const expected =
      link.invitedBy === LinkInvitedBy.PROFESSIONAL
        ? link.clientId
        : link.professionalId;
    if (actor.id !== expected) {
      throw new ForbiddenException(
        "Only the recipient of the invite can respond to it",
      );
    }
  }
}
