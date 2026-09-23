import { Injectable } from "@nestjs/common";
import type { NotificationPreference, NotificationType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { NotificationPreferenceRepository } from "../domain/ports/notification-preference.repository.port";

@Injectable()
export class PrismaNotificationPreferenceRepository
  implements NotificationPreferenceRepository
{
  constructor(private readonly prisma: PrismaService) {}

  findForUser(
    userId: string,
    type: NotificationType,
  ): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
  }

  listForUser(userId: string): Promise<NotificationPreference[]> {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  upsert(input: {
    userId: string;
    type: NotificationType;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId: input.userId, type: input.type } },
      create: {
        userId: input.userId,
        type: input.type,
        emailEnabled: input.emailEnabled,
        pushEnabled: input.pushEnabled,
      },
      update: {
        emailEnabled: input.emailEnabled,
        pushEnabled: input.pushEnabled,
      },
    });
  }
}
