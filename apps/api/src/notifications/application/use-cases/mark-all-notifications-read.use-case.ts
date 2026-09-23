import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from "../../domain/ports/notification.repository.port";

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(input: { userId: string }): Promise<{ updated: number }> {
    const updated = await this.notifications.markAllReadForUser(
      input.userId,
      new Date(),
    );
    return { updated };
  }
}
