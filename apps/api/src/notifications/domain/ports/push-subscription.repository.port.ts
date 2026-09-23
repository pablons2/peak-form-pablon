import type { PushSubscription } from "@prisma/client";

export const PUSH_SUBSCRIPTION_REPOSITORY = Symbol(
  "PUSH_SUBSCRIPTION_REPOSITORY",
);

/// §5.2's optional web-push channel. `endpoint` is globally unique (the
/// browser issues one per subscription), so registering is an upsert that
/// also re-homes a subscription if the browser hands the same endpoint to
/// a different login on a shared device.
export interface PushSubscriptionRepository {
  upsert(input: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<PushSubscription>;
  removeForUser(userId: string, endpoint: string): Promise<boolean>;
  listForUser(userId: string): Promise<PushSubscription[]>;
  /// A gone (410/404) subscription is dead forever — the push sender
  /// deletes it rather than retrying an endpoint that will never work.
  removeByEndpoint(endpoint: string): Promise<void>;
}
