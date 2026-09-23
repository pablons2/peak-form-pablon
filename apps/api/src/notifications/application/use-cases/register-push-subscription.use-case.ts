import { Inject, Injectable } from "@nestjs/common";
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from "../../domain/ports/push-subscription.repository.port";

// §5.2 — stores the browser's PushManager subscription. Idempotent by
// endpoint (the unique key): re-subscribing the same browser just
// re-stamps the keys, which is exactly what a browser key-rotation wants.
@Injectable()
export class RegisterPushSubscriptionUseCase {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptions: PushSubscriptionRepository,
  ) {}

  async execute(input: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) {
    return this.pushSubscriptions.upsert(input);
  }
}
