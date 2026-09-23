import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { DispatchNotificationUseCase } from "./application/use-cases/dispatch-notification.use-case";
import { GetMyPreferencesUseCase } from "./application/use-cases/get-my-preferences.use-case";
import { ListMyNotificationsUseCase } from "./application/use-cases/list-my-notifications.use-case";
import { MarkAllNotificationsReadUseCase } from "./application/use-cases/mark-all-notifications-read.use-case";
import { MarkNotificationReadUseCase } from "./application/use-cases/mark-notification-read.use-case";
import { RegisterPushSubscriptionUseCase } from "./application/use-cases/register-push-subscription.use-case";
import { SendAccountSecurityNotificationUseCase } from "./application/use-cases/send-account-security-notification.use-case";
import { UnregisterPushSubscriptionUseCase } from "./application/use-cases/unregister-push-subscription.use-case";
import { UpdatePreferenceUseCase } from "./application/use-cases/update-preference.use-case";
import { MAILER } from "./domain/ports/mailer.port";
import { NOTIFICATION_PREFERENCE_REPOSITORY } from "./domain/ports/notification-preference.repository.port";
import { NOTIFICATION_REPOSITORY } from "./domain/ports/notification.repository.port";
import { PUSH_SENDER } from "./domain/ports/push-sender.port";
import { PUSH_SUBSCRIPTION_REPOSITORY } from "./domain/ports/push-subscription.repository.port";
import { USER_DIRECTORY } from "./domain/ports/user-directory.port";
import { NodemailerMailerService } from "./infrastructure/nodemailer-mailer.service";
import { NotificationEventListener } from "./infrastructure/notification-event-listener.service";
import { PrismaNotificationPreferenceRepository } from "./infrastructure/prisma-notification-preference.repository";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { PrismaPushSubscriptionRepository } from "./infrastructure/prisma-push-subscription.repository";
import { PrismaUserDirectory } from "./infrastructure/prisma-user-directory.service";
import { WebPushSenderService } from "./infrastructure/web-push-sender.service";
import { NotificationsController } from "./presentation/notifications.controller";

// PRD 12 — Notifications. Deliberately imports ONLY SharedModule: it needs
// the DOMAIN_EVENT_BUS to subscribe to (every owning module emits through
// it) and the global PrismaService, nothing else. In particular it does NOT
// import AuthModule — AuthModule imports THIS module for the synchronous
// account-security send path (§5.1), so a reverse edge would be a Nest
// module cycle; the tiny UserDirectory port covers the only auth-data need
// (recipient email / sender display name). MAILER moved here from auth —
// §5.1's "one place that renders and sends transactional email".
@Module({
  imports: [SharedModule],
  controllers: [NotificationsController],
  providers: [
    { provide: MAILER, useClass: NodemailerMailerService },
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    {
      provide: NOTIFICATION_PREFERENCE_REPOSITORY,
      useClass: PrismaNotificationPreferenceRepository,
    },
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      useClass: PrismaPushSubscriptionRepository,
    },
    { provide: PUSH_SENDER, useClass: WebPushSenderService },
    { provide: USER_DIRECTORY, useClass: PrismaUserDirectory },

    DispatchNotificationUseCase,
    SendAccountSecurityNotificationUseCase,
    ListMyNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    GetMyPreferencesUseCase,
    UpdatePreferenceUseCase,
    RegisterPushSubscriptionUseCase,
    UnregisterPushSubscriptionUseCase,

    // Subscribes to every notification-producing domain event on init.
    NotificationEventListener,
  ],
  // §5.1 — AuthModule calls the synchronous account-security path directly;
  // MAILER is exported too so PRD 01's flows that still send ad-hoc email
  // (none today after this phase) keep working if reintroduced.
  exports: [SendAccountSecurityNotificationUseCase, MAILER],
})
export class NotificationsModule {}
