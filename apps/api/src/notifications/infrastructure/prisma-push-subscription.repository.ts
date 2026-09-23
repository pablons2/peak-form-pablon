import { Injectable } from "@nestjs/common";
import type { PushSubscription } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { PushSubscriptionRepository } from "../domain/ports/push-subscription.repository.port";

@Injectable()
export class PrismaPushSubscriptionRepository
  implements PushSubscriptionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  upsert(input: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<PushSubscription> {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      // Endpoint is the unique key — re-homing it to this user is the
      // shared-device case the port's comment calls out.
      create: {
        userId: input.userId,
        endpoint: input.endpoint,
        keys: input.keys as object,
      },
      update: { userId: input.userId, keys: input.keys as object },
    });
  }

  async removeForUser(userId: string, endpoint: string): Promise<boolean> {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return result.count > 0;
  }

  listForUser(userId: string): Promise<PushSubscription[]> {
    return this.prisma.pushSubscription.findMany({ where: { userId } });
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }
}
