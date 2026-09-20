import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { AcceptLinkUseCase } from "./application/use-cases/accept-link.use-case";
import { CancelCheckInScheduleUseCase } from "./application/use-cases/cancel-check-in-schedule.use-case";
import { CreateCheckInScheduleUseCase } from "./application/use-cases/create-check-in-schedule.use-case";
import { DeclineLinkUseCase } from "./application/use-cases/decline-link.use-case";
import { ForceUnlinkUseCase } from "./application/use-cases/force-unlink.use-case";
import { InviteClientUseCase } from "./application/use-cases/invite-client.use-case";
import { ListCheckInSchedulesUseCase } from "./application/use-cases/list-check-in-schedules.use-case";
import { ListLinksUseCase } from "./application/use-cases/list-links.use-case";
import { RequestProfessionalUseCase } from "./application/use-cases/request-professional.use-case";
import { RunCheckInDueJobUseCase } from "./application/use-cases/run-check-in-due-job.use-case";
import { UnlinkUseCase } from "./application/use-cases/unlink.use-case";
import { UpdateCheckInScheduleUseCase } from "./application/use-cases/update-check-in-schedule.use-case";
import {
  CHECK_IN_SCHEDULE_REPOSITORY,
} from "./domain/ports/check-in-schedule.repository.port";
import { LINK_REPOSITORY } from "./domain/ports/link.repository.port";
import { CheckInDueJobService } from "./infrastructure/check-in-due-job.service";
import { PrismaCheckInScheduleRepository } from "./infrastructure/prisma-check-in-schedule.repository";
import { PrismaLinkRepository } from "./infrastructure/prisma-link.repository";
import { AdminLinksController } from "./presentation/admin-links.controller";
import { LinksController } from "./presentation/links.controller";

// PRD 02 — Professional ↔ Client Relationship. Depends on AuthModule for the
// shared MAILER (invite/unlink notifications) and ApprovalStatusGuard; the
// global JwtAuthGuard/RolesGuard registered by AuthModule already cover these
// routes. Repository adapters are bound to their Domain ports (base doc
// §7.2 DIP); the firing job is an Infrastructure-layer scheduled service
// whose tick simply invokes RunCheckInDueJobUseCase.
@Module({
  imports: [SharedModule, AuthModule],
  controllers: [LinksController, AdminLinksController],
  providers: [
    // Infrastructure adapters bound to their Domain ports.
    { provide: LINK_REPOSITORY, useClass: PrismaLinkRepository },
    { provide: CHECK_IN_SCHEDULE_REPOSITORY, useClass: PrismaCheckInScheduleRepository },

    // Application use-cases.
    InviteClientUseCase,
    RequestProfessionalUseCase,
    AcceptLinkUseCase,
    DeclineLinkUseCase,
    UnlinkUseCase,
    ForceUnlinkUseCase,
    ListLinksUseCase,
    CreateCheckInScheduleUseCase,
    UpdateCheckInScheduleUseCase,
    CancelCheckInScheduleUseCase,
    ListCheckInSchedulesUseCase,
    RunCheckInDueJobUseCase,

    // Scheduled job (no-op when CHECK_IN_SCHEDULER_DISABLED=1).
    CheckInDueJobService,
  ],
  // Exported so PRD 05's ExerciseAccess can resolve which Professionals a
  // Client is ACTIVELY linked to (private-custom-exercise visibility, §5.3).
  exports: [LINK_REPOSITORY],
})
export class RelationshipsModule {}
