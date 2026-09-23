import type { NotificationPreference, NotificationType } from "@prisma/client";

export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol(
  "NOTIFICATION_PREFERENCE_REPOSITORY",
);

/// §5.3 — absence of a row means "defaults" (both channels on), so the
/// repository is a plain get/upsert with no defaults logic of its own;
/// what the defaults ARE and which types may even have a row lives in
/// domain/notification-types.ts above the DB.
export interface NotificationPreferenceRepository {
  findForUser(
    userId: string,
    type: NotificationType,
  ): Promise<NotificationPreference | null>;
  listForUser(userId: string): Promise<NotificationPreference[]>;
  upsert(input: {
    userId: string;
    type: NotificationType;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }): Promise<NotificationPreference>;
}
