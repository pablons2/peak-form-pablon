import { Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { LinkStatus, Role } from "@prisma/client";
import { ForceUnlinkUseCase } from "../application/use-cases/force-unlink.use-case";
import { ListLinksUseCase } from "../application/use-cases/list-links.use-case";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import type { LinkWithParties } from "../domain/ports/link.repository.port";

function toPublicParty(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

function toPublicLink(link: LinkWithParties) {
  return {
    id: link.id,
    specialization: link.specialization,
    status: link.status,
    invitedBy: link.invitedBy,
    expiresAt: link.expiresAt,
    linkedAt: link.linkedAt,
    unlinkedAt: link.unlinkedAt,
    createdAt: link.createdAt,
    professional: toPublicParty(link.professional),
    client: toPublicParty(link.client),
  };
}

// PRD 02 §5.5 — Admin oversight: view every relationship and force-unlink
// any of them (dispute resolution, Professional deactivation cleanup from
// PRD 01 §5.5). Reuses the shared guard stack; no route-level surprises.
@Roles(Role.ADMIN)
@Controller("admin/links")
export class AdminLinksController {
  constructor(
    private readonly listLinks: ListLinksUseCase,
    private readonly forceUnlink: ForceUnlinkUseCase,
  ) {}

  @Get()
  listAllHandler(@Query("status") status?: string) {
    return this.listLinks
      .execute({
        viewerId: "", // the ADMIN branch of the use-case never reads this
        viewerRole: Role.ADMIN,
        status: status as LinkStatus | undefined,
      })
      .then((links) => links.map(toPublicLink));
  }

  @HttpCode(200)
  @Post(":linkId/force-unlink")
  forceUnlinkHandler(
    @Param("linkId") linkId: string,
    @CurrentUser() admin: UserWithProfiles,
  ) {
    return this.forceUnlink.execute({ adminId: admin.id, linkId });
  }
}
