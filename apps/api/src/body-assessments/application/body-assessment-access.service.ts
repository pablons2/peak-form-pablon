import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { LinkStatus, Role } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../relationships/domain/ports/link.repository.port";

// PRD 04 §4 — permission matrix. Unlike PRD 03's IntakeAccess (no Admin
// access at all), Body Assessment's table gives Admin a ✅ specifically on
// "create formal/validated assessment" but no row on "view own history" —
// that asymmetry is implemented literally here: `assertCanCreateFormal`
// bypasses the link check for Admin, but there is deliberately no
// Admin-bypass method for viewing a Client's history (only
// ListClientBodyAssessmentsUseCase, Professional-only, exists for that).
@Injectable()
export class BodyAssessmentAccess {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  /// A Professional may only act on (create for / view) a Client they hold
  /// an ACTIVE link with, any specialization — both a PT and a Nutritionist
  /// have a legitimate reason to record/view body composition data.
  async assertProfessionalLinkedToClient(
    professionalId: string,
    clientId: string,
  ): Promise<void> {
    const links = await this.links.listForProfessional(professionalId);
    const linked = links.some(
      (l) => l.clientId === clientId && l.status === LinkStatus.ACTIVE,
    );
    if (!linked) {
      throw new ForbiddenException(
        "You can only record or view body assessments for your own linked clients",
      );
    }
  }

  /// §4 — creating a formal assessment: Admin unrestricted, Professional
  /// requires the ACTIVE link above, Client never reaches this (role-gated
  /// at the controller).
  async assertCanCreateFormal(
    actor: { id: string; role: Role },
    clientId: string,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    await this.assertProfessionalLinkedToClient(actor.id, clientId);
  }

  /// Photo-upload-url issuance is reachable by all three roles (§5.7's
  /// upload flow is shared): a Client may only request a key under their
  /// own clientId, a Professional needs the ACTIVE link, Admin is
  /// unrestricted (mirrors §4's create-formal row).
  async assertCanUploadPhotoFor(
    actor: { id: string; role: Role },
    clientId: string,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.CLIENT) {
      if (actor.id !== clientId) {
        throw new ForbiddenException(
          "You can only upload photos to your own body assessment history",
        );
      }
      return;
    }
    await this.assertProfessionalLinkedToClient(actor.id, clientId);
  }
}
