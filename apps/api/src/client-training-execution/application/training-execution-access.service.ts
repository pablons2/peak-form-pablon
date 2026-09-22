import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { LinkStatus, Specialization } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../relationships/domain/ports/link.repository.port";

// PRD 07 §4 — a Professional's read-only access to a linked Client's
// execution history. Unlike PRD 03/04's IntakeAccess/BodyAssessmentAccess
// (any ACTIVE link, any specialization — both a PT and a Nutritionist need
// that clinical data), execution history is specifically about a Training
// Plan's dated Sessions, which only a PERSONAL_TRAINER link's Professional
// ever authors (PRD 06 §4's PersonalTrainerGuard). A Nutritionist linked to
// the same Client has no plan of their own this data belongs to, so the
// check is scoped to PERSONAL_TRAINER here, deliberately narrower than the
// Intake/Body-Assessment precedent.
@Injectable()
export class TrainingExecutionAccess {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  async assertProfessionalLinkedToClient(
    professionalId: string,
    clientId: string,
  ): Promise<void> {
    const links = await this.links.listForProfessional(professionalId);
    const linked = links.some(
      (l) =>
        l.clientId === clientId &&
        l.status === LinkStatus.ACTIVE &&
        l.specialization === Specialization.PERSONAL_TRAINER,
    );
    if (!linked) {
      throw new ForbiddenException(
        "You can only view execution history for your own linked clients",
      );
    }
  }
}
