import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { MessagingAccess } from "./application/messaging-access.service";
import { GetThreadUseCase } from "./application/use-cases/get-thread.use-case";
import { GetThreadWithUseCase } from "./application/use-cases/get-thread-with.use-case";
import { ListMyThreadsUseCase } from "./application/use-cases/list-my-threads.use-case";
import { SendMessageUseCase } from "./application/use-cases/send-message.use-case";
import { SyncThreadOnLinkStatusChangedUseCase } from "./application/use-cases/sync-thread-on-link-status-changed.use-case";
import { MESSAGING_REPOSITORY } from "./domain/ports/messaging.repository.port";
import { LinkStatusChangedListener } from "./infrastructure/link-status-changed-listener.service";
import { PrismaMessagingRepository } from "./infrastructure/prisma-messaging.repository";
import { MessagingController } from "./presentation/messaging.controller";

// PRD 11 — Messaging. Deliberately does NOT import RelationshipsModule: a
// MessageThread's own professionalId/clientId columns are the durable
// record of who its two parties are (kept in sync via the
// LINK_STATUS_CHANGED domain event, not re-derived from PRD 02's
// ProfessionalClientLink on every request), so there's no need for
// LINK_REPOSITORY here. The only cross-module dependency is SharedModule's
// DOMAIN_EVENT_BUS, which RelationshipsModule also depends on — the two
// modules stay fully decoupled at the Nest module-graph level, exactly like
// PRD 02/PRD 12 via CHECK_IN_DUE.
@Module({
  imports: [SharedModule, AuthModule],
  controllers: [MessagingController],
  providers: [
    { provide: MESSAGING_REPOSITORY, useClass: PrismaMessagingRepository },

    MessagingAccess,
    SyncThreadOnLinkStatusChangedUseCase,
    ListMyThreadsUseCase,
    GetThreadUseCase,
    GetThreadWithUseCase,
    SendMessageUseCase,

    // Subscribes to LINK_STATUS_CHANGED on module init.
    LinkStatusChangedListener,
  ],
})
export class MessagingModule {}
