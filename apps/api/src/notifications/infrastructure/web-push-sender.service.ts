import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  PushSender,
  PushSendResult,
} from "../domain/ports/push-sender.port";

// §5.2 — the real web-push adapter (VAPID). `configured === false` whenever
// the VAPID env vars are absent — which is the normal state in dev/CI and
// exactly what §5.2's "falls back silently to email-only" describes: the
// dispatcher checks `configured` and simply skips the channel.
//
// web-push is imported lazily inside the constructor only when configured,
// so the dependency is never loaded (and can even be absent) in
// environments that never use push.
@Injectable()
export class WebPushSenderService implements PushSender {
  private readonly logger = new Logger(WebPushSenderService.name);
  readonly configured: boolean;
  readonly publicKey: string | null;
  private webpush: typeof import("web-push") | null = null;

  constructor(config: ConfigService) {
    const publicKey = config.get<string>("WEB_PUSH_VAPID_PUBLIC_KEY") ?? null;
    const privateKey = config.get<string>("WEB_PUSH_VAPID_PRIVATE_KEY") ?? null;
    this.publicKey = publicKey;
    this.configured = Boolean(publicKey && privateKey);
    if (this.configured) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpush = require("web-push") as typeof import("web-push");
      webpush.setVapidDetails(
        config.get<string>("WEB_PUSH_VAPID_SUBJECT") ??
          "mailto:no-reply@peakform.local",
        publicKey!,
        privateKey!,
      );
      this.webpush = webpush;
    }
  }

  async send(input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    payload: Record<string, unknown>;
  }): Promise<PushSendResult> {
    if (!this.webpush) return "failed";
    try {
      await this.webpush.sendNotification(
        { endpoint: input.endpoint, keys: input.keys },
        JSON.stringify(input.payload),
      );
      return "sent";
    } catch (err) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode: unknown }).statusCode)
          : 0;
      // 404/410 = the subscription is dead for good (§5.2's "not
      // available" case) — report `gone` so the caller deletes the row
      // rather than retrying a permanently-dead endpoint.
      if (statusCode === 404 || statusCode === 410) return "gone";
      this.logger.warn(
        `Web push send failed (${statusCode || "no status"}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return "failed";
    }
  }
}
