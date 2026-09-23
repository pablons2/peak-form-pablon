import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ApprovalStatus,
  LinkInvitedBy,
  LinkStatus,
  Role,
  Specialization,
} from "@prisma/client";
import { MAILER } from "../../../notifications/domain/ports/mailer.port";
import type { Mailer } from "../../../notifications/domain/ports/mailer.port";
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserWithProfiles,
} from "../../../auth/domain/ports/user.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../domain/ports/link.repository.port";
import { specializationLabel } from "../../domain/labels";

// PRD 02 §5.1 — invite flow, Professional-initiated. One PENDING
// ProfessionalClientLink row per requested specialization. If the email
// matches an existing Client account the link row is created now and the
// client is notified; if it doesn't match any account, an email invite is
// sent whose signup link leads the new Client through the request flow
// (POST /links/requests), which auto-creates the pending link — the schema
// keeps clientId required, so no row can exist before the account does.
// PENDING invites auto-expire after 30 days (expiresAt; swept lazily by the
// check-in due job and enforced at accept time).
export const INVITE_EXPIRY_DAYS = 30;

@Injectable()
export class InviteClientUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async execute(input: {
    professionalId: string;
    clientEmail: string;
    specializations: Specialization[];
  }) {
    const professional = await this.users.findById(input.professionalId);
    const profile = professional?.professionalProfile;
    if (!professional || !profile) {
      throw new NotFoundException("Professional account not found");
    }
    if (profile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        "Your professional account is awaiting admin approval",
      );
    }
    const notMine = input.specializations.filter(
      (s) => !profile.specializations.includes(s),
    );
    if (notMine.length > 0) {
      throw new ForbiddenException(
        "You can only invite clients for your own specializations",
      );
    }

    const client = await this.users.findByEmail(input.clientEmail);
    if (client && client.role !== Role.CLIENT) {
      throw new BadRequestException(
        "That email belongs to an existing non-client account",
      );
    }

    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const created = [];
    for (const specialization of input.specializations) {
      if (client) {
        const existing = await this.links.findLatestByKey(
          professional.id,
          client.id,
          specialization,
        );
        if (
          existing &&
          (existing.status === LinkStatus.PENDING ||
            existing.status === LinkStatus.ACTIVE)
        ) {
          throw new ConflictException(
            `A ${linkStatusLabel(existing.status)} ${specializationLabel(specialization)} link with this client already exists`,
          );
        }
        created.push(
          await this.links.create({
            professionalId: professional.id,
            clientId: client.id,
            specialization,
            invitedBy: LinkInvitedBy.PROFESSIONAL,
            expiresAt,
          }),
        );
      }

      await this.mailer.send({
        to: input.clientEmail,
        subject: "PeakForm — you have a new invitation",
        text: client
          ? `${professional.fullName} invited you to work together on PeakForm as your ${specializationLabel(specialization)}. Log in to accept or decline.`
          : `${professional.fullName} invited you to work together on PeakForm as your ${specializationLabel(specialization)}. Sign up at ${signupUrl(professional.email, specialization)} and the invite will be waiting for you.`,
      });
    }
    return created;
  }
}

function linkStatusLabel(s: LinkStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function signupUrl(professionalEmail: string, s: Specialization): string {
  const base = process.env.WEB_BASE_URL ?? "http://localhost:3000";
  return `${base}/signup/client?invite=${encodeURIComponent(professionalEmail)}&specialization=${s}`;
}
