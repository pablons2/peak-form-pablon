import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../../domain/ports/notification.repository.port";

// §7 — marking read is idempotent (an already-read row just re-stamps);
// a row that doesn't exist OR belongs to someone else is a 404, the
// codebase's existence-hiding precedent (same as messaging's non-party 404).
@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(input: { userId: string; notificationId: string }) {
    const existing = await this.notifications.findByIdForUser(
      input.notificationId,
      input.userId,
    );
    if (!existing) throw new NotFoundException("Notification not found");
    return this.notifications.markRead(existing.id, new Date());
  }
}
