import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { LinkStatus, Role } from "@prisma/client";
import type {
  CreateCheckInScheduleInput,
  InviteClientInput,
  RequestProfessionalInput,
  UpdateCheckInScheduleInput,
} from "@peakform/validation";
import {
  createCheckInScheduleSchema,
  inviteClientSchema,
  requestProfessionalSchema,
  updateCheckInScheduleSchema,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import type { LinkWithParties } from "../domain/ports/link.repository.port";
import { AcceptLinkUseCase } from "../application/use-cases/accept-link.use-case";
import { CancelCheckInScheduleUseCase } from "../application/use-cases/cancel-check-in-schedule.use-case";
import { CreateCheckInScheduleUseCase } from "../application/use-cases/create-check-in-schedule.use-case";
import { DeclineLinkUseCase } from "../application/use-cases/decline-link.use-case";
import { InviteClientUseCase } from "../application/use-cases/invite-client.use-case";
import { ListCheckInSchedulesUseCase } from "../application/use-cases/list-check-in-schedules.use-case";
import { ListLinksUseCase } from "../application/use-cases/list-links.use-case";
import { RequestProfessionalUseCase } from "../application/use-cases/request-professional.use-case";
import { UnlinkUseCase } from "../application/use-cases/unlink.use-case";
import { UpdateCheckInScheduleUseCase } from "../application/use-cases/update-check-in-schedule.use-case";

// Never let raw User rows (passwordHash, token hashes) leave the process —
// same rule as admin-users.controller.ts (base doc §9).
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
    unlinkedById: link.unlinkedById,
    createdAt: link.createdAt,
    professional: toPublicParty(link.professional),
    client: toPublicParty(link.client),
  };
}

// PRD 02 §5/§7 — relationship lifecycle + check-in scheduling endpoints,
// shared by both personas. Authorization is enforced server-side on every
// route (base doc §9): role gates via @Roles + ApprovalStatusGuard for
// Professional-only actions, and party membership is re-checked inside the
// use-cases — never trusting the caller's word.
@Controller("links")
export class LinksController {
  constructor(
    private readonly inviteClient: InviteClientUseCase,
    private readonly requestProfessional: RequestProfessionalUseCase,
    private readonly acceptLink: AcceptLinkUseCase,
    private readonly declineLink: DeclineLinkUseCase,
    private readonly unlink: UnlinkUseCase,
    private readonly listLinks: ListLinksUseCase,
    private readonly createSchedule: CreateCheckInScheduleUseCase,
    private readonly updateSchedule: UpdateCheckInScheduleUseCase,
    private readonly cancelSchedule: CancelCheckInScheduleUseCase,
    private readonly listSchedules: ListCheckInSchedulesUseCase,
  ) {}

  // §5.1 — Professional invites a Client by email, per specialization.
  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @Post("invites")
  inviteHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(inviteClientSchema)) body: InviteClientInput,
  ) {
    return this.inviteClient
      .execute({
        professionalId: user.id,
        clientEmail: body.clientEmail,
        specializations: body.specializations,
      })
      .then((links) => links.map(toPublicLink));
  }

  // §5.2 — Client requests a Professional by email.
  @Roles(Role.CLIENT)
  @Post("requests")
  requestHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(requestProfessionalSchema))
    body: RequestProfessionalInput,
  ) {
    return this.requestProfessional
      .execute({
        clientId: user.id,
        professionalEmail: body.professionalEmail,
        specialization: body.specialization,
      })
      .then(toPublicLink);
  }

  // §7 — Professional's client list (Pending vs Active) and the Client's
  // "My Team" screen; optional ?status= filter applied in the use-case.
  @Get("mine")
  listMineHandler(
    @CurrentUser() user: UserWithProfiles,
    @Query("status") status?: string,
  ) {
    return this.listLinks
      .execute({
        viewerId: user.id,
        viewerRole: user.role,
        status: status as LinkStatus | undefined,
      })
      .then((links) => links.map(toPublicLink));
  }

  // §5.2 — accept/decline work in either direction; the use-case verifies
  // the caller is the invite's recipient.
  @HttpCode(200)
  @Post(":id/accept")
  acceptHandler(
    @Param("id") linkId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.acceptLink
      .execute({ actor: user, linkId })
      .then(toPublicLink);
  }

  @HttpCode(200)
  @Post(":id/decline")
  declineHandler(
    @Param("id") linkId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.declineLink
      .execute({ actor: user, linkId })
      .then(toPublicLink);
  }

  // §5.4 — either party unlinks an ACTIVE relationship.
  @HttpCode(200)
  @Post(":id/unlink")
  unlinkHandler(
    @Param("id") linkId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.unlink.execute({ actorId: user.id, linkId }).then(toPublicLink);
  }

  // §5.6 — check-in schedule CRUD (Professional-only, own ACTIVE links).
  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @Post(":id/check-ins")
  createScheduleHandler(
    @Param("id") linkId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createCheckInScheduleSchema))
    data: CreateCheckInScheduleInput,
  ) {
    return this.createSchedule.execute({
      professionalId: user.id,
      linkId,
      data,
    });
  }

  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(200)
  @Patch(":id/check-ins/:scheduleId")
  updateScheduleHandler(
    @Param("id") _linkId: string,
    @Param("scheduleId") scheduleId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateCheckInScheduleSchema))
    data: UpdateCheckInScheduleInput,
  ) {
    return this.updateSchedule.execute({
      professionalId: user.id,
      scheduleId,
      data,
    });
  }

  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(200)
  @Post(":id/check-ins/:scheduleId/cancel")
  cancelScheduleHandler(
    @Param("id") _linkId: string,
    @Param("scheduleId") scheduleId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.cancelSchedule.execute({
      professionalId: user.id,
      scheduleId,
    });
  }

  // §4 — both parties of a link may view its schedules (Client read-only).
  @Get(":id/check-ins")
  listSchedulesHandler(
    @Param("id") linkId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.listSchedules.execute({ viewerId: user.id, linkId });
  }
}
