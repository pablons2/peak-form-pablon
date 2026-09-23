import { Inject, Injectable } from "@nestjs/common";
import {
  PUSH_SUBSCRIPTION_REPOSITORY,
  type PushSubscriptionRepository,
} from "../../domain/ports/push-subscription.repository.port";

@Injectable()
export class UnregisterPushSubscriptionUseCase {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly pushSubscriptions: PushSubscriptionRepository,
  ) {}

  async execute(input: { userId: string; endpoint: string }) {
    // Scoped to the caller — you can only detach your own subscription.
    return {
      removed: await this.pushSubscriptions.removeForUser(
        input.userId,
        input.endpoint,
      ),
    };
  }
}
