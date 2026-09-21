import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { LinkStatus } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../relationships/domain/ports/link.repository.port";

// PRD 03 §4 — "View a linked Client's intake" is Professional-only for their
// own clients (Admin has no row in that permission table at all — intake is
// clinical health data, unlike the Exercise Library's Admin-curated catalog,
// so no admin bypass exists here). "Own" means any ACTIVE link, regardless
// of specialization — both a PT and a Nutritionist need the same safety
// screen.
@Injectable()
export class IntakeAccess {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

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
        "You can only view intake data for your own linked clients",
      );
    }
  }
}
