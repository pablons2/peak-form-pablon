import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ApprovalStatus,
  LinkInvitedBy,
  LinkStatus,
  Specialization,
} from "@prisma/client";
import { MAILER } from "../../../notifications/domain/ports/mailer.port";
import type { Mailer } from "../../../notifications/domain/ports/mailer.port";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../../auth/domain/ports/user.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";
import {
  linkStatusLabel,
  specializationLabel,
} from "../../domain/labels";
import { INVITE_EXPIRY_DAYS } from "./invite-client.use-case";

// PRD 02 §5.2 — Client-initiated request. The Client names a Professional's
// email and the specialization they want; this creates a PENDING
// ProfessionalClientLink the Professional must accept/decline. The
// one-PT-one-Nutritionist constraint (§5.3) is checked here too: a Client
// already holding an ACTIVE link of the same specialization can't request
// another — unlink first.
@Injectable()
export class RequestProfessionalUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async execute(input: {
    clientId: string;
    professionalEmail: string;
    specialization: Specialization;
  }) {
    const professional = await this.users.findByEmail(input.professionalEmail);
    const profile = professional?.professionalProfile;
    if (!professional || !profile) {
      throw new NotFoundException(
        "No professional account exists with that email",
      );
    }
    if (profile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new NotFoundException(
        "No APPROVED professional account exists with that email",
      );
    }
    if (!profile.specializations.includes(input.specialization)) {
      throw new BadRequestException(
        `${professional.fullName} is not a ${specializationLabel(input.specialization)}`,
      );
    }

    const active = await this.links.findActiveForClient(
      input.clientId,
      input.specialization,
    );
    if (active) {
      throw new ConflictException(
        active.specialization === Specialization.PERSONAL_TRAINER
          ? "You already have an active trainer — unlink first"
          : "You already have an active nutritionist — unlink first",
      );
    }

    const existing = await this.links.findLatestByKey(
      professional.id,
      input.clientId,
      input.specialization,
    );
    if (
      existing &&
      (existing.status === LinkStatus.PENDING ||
        existing.status === LinkStatus.ACTIVE)
    ) {
      throw new ConflictException(
        `A ${linkStatusLabel(existing.status)} ${specializationLabel(input.specialization)} link with this professional already exists`,
      );
    }

    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const link = await this.links.create({
      professionalId: professional.id,
      clientId: input.clientId,
      specialization: input.specialization,
      invitedBy: LinkInvitedBy.CLIENT,
      expiresAt,
    });

    await this.mailer.send({
      to: professional.email,
      subject: "PeakForm — a client wants to work with you",
      text: `A client requested to work with you on PeakForm as their ${specializationLabel(input.specialization)}. Log in to accept or decline.`,
    });

    return link;
  }
}
