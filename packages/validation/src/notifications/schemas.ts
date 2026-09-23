// PRD 12 — Notifications input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// §5.3 — per-type channel toggles. At least one field must be present; the
// "account-critical email can't be disabled" rule lives in the use-case,
// not the schema (it's a per-type rule, not a shape rule).
export const updateNotificationPreferenceSchema = z
  .object({
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
  })
  .refine((v) => v.emailEnabled !== undefined || v.pushEnabled !== undefined, {
    message: "At least one channel toggle is required",
  });
export type UpdateNotificationPreferenceInput = z.infer<
  typeof updateNotificationPreferenceSchema
>;

// §5.2 — the browser PushManager subscription JSON (endpoint + encryption
// keys). `endpoint` must be a real URL — it's the push service's delivery
// address, so a malformed value can only ever fail downstream.
export const registerPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type RegisterPushSubscriptionInput = z.infer<
  typeof registerPushSubscriptionSchema
>;

export const unregisterPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});
export type UnregisterPushSubscriptionInput = z.infer<
  typeof unregisterPushSubscriptionSchema
>;
