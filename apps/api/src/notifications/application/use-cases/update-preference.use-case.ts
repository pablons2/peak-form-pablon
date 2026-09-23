import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import {
  isAccountSecurity,
  isEmailLocked,
  isPreferenceEligible,
} from "../../domain/notification-types";
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepository,
} from "../../domain/ports/notification-preference.repository.port";

// §5.3 — writes one (userId, type) toggle row. Two server-side refusals
// the UI can't be trusted with: account-security types get NO row at all
// (§5.1 — they bypass the preference system, not merely locked-on), and
// APPROVAL_DECISION's email channel can't be disabled (§10 AC).
@Injectable()
export class UpdatePreferenceUseCase {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
  ) {}

  async execute(input: {
    userId: string;
    type: NotificationType;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
  }) {
    if (!isPreferenceEligible(input.type)) {
      throw new BadRequestException(
        isAccountSecurity(input.type)
          ? "Account-security notifications have no preferences"
          : "Unknown notification type",
      );
    }
    if (isEmailLocked(input.type) && input.emailEnabled === false) {
      throw new BadRequestException(
        "Email delivery for account decisions cannot be disabled",
      );
    }

    const existing = await this.preferences.findForUser(
      input.userId,
      input.type,
    );
    return this.preferences.upsert({
      userId: input.userId,
      type: input.type,
      emailEnabled: isEmailLocked(input.type)
        ? true
        : (input.emailEnabled ?? existing?.emailEnabled ?? true),
      pushEnabled: input.pushEnabled ?? existing?.pushEnabled ?? true,
    });
  }
}
