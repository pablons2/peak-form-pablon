import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../../domain/ports/notification.repository.port";

const PAGE_SIZE = 50;

// PRD 12 §7 — the in-app list: the caller's own notifications, newest
// first, plus the unread count the dashboard bell badges.
@Injectable()
export class ListMyNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(input: { userId: string }) {
    const [notifications, unreadCount] = await Promise.all([
      this.notifications.listForUser(input.userId, PAGE_SIZE),
      this.notifications.unreadCountForUser(input.userId),
    ]);
    return { notifications, unreadCount };
  }
}
