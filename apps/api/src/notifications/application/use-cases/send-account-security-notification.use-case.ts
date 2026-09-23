import { Inject, Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { describeNotification, renderSecurityEmail } from "../../domain/notification-text";
import { MAILER, type Mailer } from "../../domain/ports/mailer.port";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../../domain/ports/notification.repository.port";

// Prisma enums are const-objects, not TS enums — member literals can't be
// used as type annotations directly, hence Extract.
export type AccountSecurityType = Extract<
  NotificationType,
  "EMAIL_VERIFICATION" | "PASSWORD_RESET"
>;

// PRD 12 §5.1's "Account security" note — the ONE trigger family that does
// NOT go through the event bus / preference / dispatcher path: PRD 01's
// flows call this directly and synchronously, because a verification or
// reset link must go out immediately and can never be delayed, batched,
// or suppressed by a user preference. It still writes a Notification row
// (the in-app list is the user's own record of what was sent) and still
// uses this module's shared mailer/templates — but there is no
// NotificationPreference lookup and no push variant, ever.
@Injectable()
export class SendAccountSecurityNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async execute(input: {
    userId: string;
    email: string;
    type: AccountSecurityType;
    /// The raw one-time token — goes in the email only, never into the
    /// persisted Notification payload (same hash-only-at-rest rule as the
    /// User columns these tokens back).
    token: string;
    /// Optional extra line appended to the template (e.g. the
    /// Professional-signup "an administrator will review" note PRD 01's
    /// original email carried).
    extraText?: string;
  }): Promise<void> {
    const { subject, text } = renderSecurityEmail(input.type, {
      token: input.token,
      extraText: input.extraText,
    });
    // Send first: the email is the point of the flow and must not be lost
    // to a later write failing; the in-app record is a best-effort receipt.
    await this.mailer.send({ to: input.email, subject, text });

    const { title, body } = describeNotification(input.type, {});
    await this.notifications.create({
      userId: input.userId,
      type: input.type,
      payload: { title, body },
      dedupeKey: null,
    });
  }
}
