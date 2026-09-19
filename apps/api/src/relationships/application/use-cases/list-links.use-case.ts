import { Inject, Injectable } from "@nestjs/common";
import { LinkStatus, Role } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
  type LinkWithParties,
} from "../../domain/ports/link.repository.port";

// PRD 02 §4/§7 — viewing links. Professionals see their own client list
// (Pending vs Active), Clients see their own team, Admins see everything.
// Status filtering is applied here in the Application layer.
@Injectable()
export class ListLinksUseCase {
  constructor(@Inject(LINK_REPOSITORY) private readonly links: LinkRepository) {}

  async execute(input: {
    viewerId: string;
    viewerRole: Role;
    status?: LinkStatus;
  }) {
    let links: LinkWithParties[];
    if (input.viewerRole === Role.ADMIN) {
      links = await this.links.listAll();
    } else if (input.viewerRole === Role.PROFESSIONAL) {
      links = await this.links.listForProfessional(input.viewerId);
    } else {
      links = await this.links.listForClient(input.viewerId);
    }

    if (input.status) {
      links = links.filter((l) => l.status === input.status);
    }
    return links;
  }
}
