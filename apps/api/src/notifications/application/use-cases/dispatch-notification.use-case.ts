import { Inject, Injectable, Logger } from "@nestjs/common";
import { Prisma, type NotificationType } from "@prisma/client";
import {
  dedupeKeyFor,
  isEmailLocked,
  isPreferenceEligible,
} from "../../domain/notification-types";
import { describeNotification, renderEmail } from "../../domain/notification-text";
import { MAILER, type Mailer } from "../../domain/ports/mailer.port";
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepository,
} from "../../domain/ports/notification-preference.repository.port";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../../domain/ports/notification.repository.port";
import {
  PUSH_SENDER,
  type PushSender,
} from "../../domain/ports/push-sender.port";
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from "../../domain/ports/push-subscription.repository.port";
import {
  USER_DIRECTORY,
  type UserDirectory,
} from "../../domain/ports/user-directory.port";

export type DispatchResult = "created" | "duplicate";

// PRD 12 §5.4 — the single funnel every preference-eligible trigger flows
// through: write the Notification row first (the in-app list is the
// always-on surface, §7 — channel opt-outs can never suppress it), then
// fan out to whichever channels the user's NotificationPreference leaves
// enabled. Exactly-once per occurrence comes from the (userId, type,
// dedupeKey) unique constraint claimed at insert time — a duplicate P2002
// means "already notified", not an error.
@Injectable()
export class DispatchNotificationUseCase {
  private readonly logger = new Logger(DispatchNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptions: PushSubscriptionRepository,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(USER_DIRECTORY) private readonly users: UserDirectory,
  ) {}

  async execute(input: {
    recipientUserId: string;
    type: NotificationType;
    payload: Record<string, unknown>;
  }): Promise<DispatchResult> {
    const { recipientUserId, type, payload } = input;
    const { title, body } = describeNotification(type, payload);

    try {
      await this.notifications.create({
        userId: recipientUserId,
        type,
        payload: { ...payload, title, body },
        dedupeKey: dedupeKeyFor(type, payload),
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return "duplicate";
      }
      throw err;
    }

    const pref = isPreferenceEligible(type)
      ? await this.preferences.findForUser(recipientUserId, type)
        : null;
    // §5.3 — account-critical types send email even if a stale/pref row
    // says otherwise (UpdatePreferenceUseCase refuses to write email=false
    // for them, but the dispatcher is the real enforcement point).
    const emailEnabled = isEmailLocked(type) ? true : (pref?.emailEnabled ?? true);
    const pushEnabled = pref?.pushEnabled ?? true;

    if (emailEnabled) {
      // Per-channel isolation: a broken email send must not take the push
      // fan-out down with it (the in-app row above is already durable).
      try {
        const contact = await this.users.findContact(recipientUserId);
        if (contact) {
          const { subject, text } = renderEmail(type, payload);
          await this.mailer.send({ to: contact.email, subject, text });
        }
      } catch (err) {
        this.logger.error(
          `Email delivery failed for ${type} -> ${recipientUserId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    // §5.2 — silent fallback: no configured VAPID keys or no subscription
    // simply means no push, never an error path.
    if (pushEnabled && this.pushSender.configured) {
      try {
        const subs = await this.pushSubscriptions.listForUser(recipientUserId);
        for (const sub of subs) {
          const keys = sub.keys as { p256dh: string; auth: string };
          const result = await this.pushSender.send({
            endpoint: sub.endpoint,
            keys,
            payload: { type, title, body },
          });
          if (result === "gone") {
            await this.pushSubscriptions.removeByEndpoint(sub.endpoint);
          }
        }
      } catch (err) {
        this.logger.error(
          `Push delivery failed for ${type} -> ${recipientUserId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return "created";
  }
}
