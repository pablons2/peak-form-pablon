export const PUSH_SENDER = Symbol("PUSH_SENDER");

export type PushSendResult = "sent" | "gone" | "failed";

/// §5.2's optional web-push channel boundary (web-push / VAPID in
/// production, faked in tests). `configured` is the "push isn't available"
/// half of §5.2's silent fallback — false when VAPID env vars are unset,
/// and the dispatcher simply skips the channel rather than erroring.
export interface PushSender {
  readonly configured: boolean;
  /// The VAPID public key the browser needs for PushManager.subscribe —
  /// null when unconfigured (the same "push isn't available" state).
  readonly publicKey: string | null;
  /// `gone` means the push service reported the subscription dead
  /// (404/410) — the caller removes it. Any other failure is `failed`.
  send(input: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    payload: Record<string, unknown>;
  }): Promise<PushSendResult>;
}
