import { Injectable } from "@nestjs/common";
import type { Notification, NotificationType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { NotificationRepository } from "../domain/ports/notification.repository.port";

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    userId: string;
    type: NotificationType;
    payload: Record<string, unknown>;
    dedupeKey: string | null;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        payload: input.payload as object,
        dedupeKey: input.dedupeKey,
      },
    });
  }

  listForUser(userId: string, take: number): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  unreadCountForUser(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  findByIdForUser(id: string, userId: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({ where: { id, userId } });
  }

  markRead(id: string, at: Date): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: at },
    });
  }

  async markAllReadForUser(userId: string, at: Date): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: at },
    });
    return result.count;
  }
}
