// Typed server-side client for the Notifications endpoints (PRD 12). Same
// conventions as features/messaging/api-client.ts — every call is
// Bearer-authenticated, results come back as the {ok,data}/{ok:false} union.
import type {
  RegisterPushSubscriptionInput,
  UnregisterPushSubscriptionInput,
  UpdateNotificationPreferenceInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export type NotificationType =
  | "SESSION_REMINDER"
  | "MISSED_SESSION"
  | "MISSED_FOOD_LOG"
  | "NEW_MESSAGE"
  | "PLAN_UPDATED"
  | "WEEKLY_SUMMARY_READY"
  | "CHECK_IN_DUE"
  | "APPROVAL_DECISION"
  | "EMAIL_VERIFICATION"
  | "PASSWORD_RESET";

export interface PublicNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface PublicNotificationPreference {
  type: NotificationType;
  emailEnabled: boolean;
  pushEnabled: boolean;
  emailLocked: boolean;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function failure<T>(res: Response, data: { message?: string | string[] }): ApiResult<T> {
  const message = Array.isArray(data.message)
    ? data.message.join(" ")
    : (data.message ?? `Request failed (${res.status})`);
  return { ok: false, status: res.status, message };
}

async function request<T>(
  accessToken: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: "API unreachable" };
  }
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string | string[];
  };
  if (!res.ok) return failure(res, data);
  return { ok: true, data };
}

export function listMyNotifications(accessToken: string) {
  return request<{ notifications: PublicNotification[]; unreadCount: number }>(
    accessToken,
    "/notifications",
  );
}

export function markNotificationRead(accessToken: string, id: string) {
  return request<{ notification: PublicNotification }>(
    accessToken,
    `/notifications/${id}/read`,
    { method: "PATCH" },
  );
}

export function markAllNotificationsRead(accessToken: string) {
  return request<{ marked: number }>(accessToken, "/notifications/read-all", {
    method: "POST",
  });
}

export function getMyPreferences(accessToken: string) {
  return request<{ preferences: PublicNotificationPreference[] }>(
    accessToken,
    "/notifications/preferences",
  );
}

export function updatePreference(
  accessToken: string,
  type: string,
  input: UpdateNotificationPreferenceInput,
) {
  return request<PublicNotificationPreference>(
    accessToken,
    `/notifications/preferences/${type}`,
    { method: "PUT", body: input },
  );
}

export function getPushPublicKey(accessToken: string) {
  return request<{ publicKey: string | null }>(accessToken, "/notifications/push/public-key");
}

export function registerPushSubscription(
  accessToken: string,
  input: RegisterPushSubscriptionInput,
) {
  return request<{ registered: boolean }>(accessToken, "/notifications/push-subscriptions", {
    method: "POST",
    body: input,
  });
}

export function unregisterPushSubscription(
  accessToken: string,
  input: UnregisterPushSubscriptionInput,
) {
  return request<{ removed: boolean }>(accessToken, "/notifications/push-subscriptions", {
    method: "DELETE",
    body: input,
  });
}
