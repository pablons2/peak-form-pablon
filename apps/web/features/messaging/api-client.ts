// Typed server-side client for the Messaging endpoints (PRD 11). Same
// conventions as features/body-assessments/api-client.ts — every call is
// Bearer-authenticated, results come back as the {ok,data}/{ok:false} union.
import type { SendMessageInput } from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export type MessageThreadStatus = "ACTIVE" | "READ_ONLY";

export interface PublicThreadParty {
  id: string;
  fullName: string;
}

export interface PublicThread {
  id: string;
  status: MessageThreadStatus;
  professional: PublicThreadParty;
  client: PublicThreadParty;
  createdAt: string;
  updatedAt: string;
}

export interface PublicThreadSummary extends PublicThread {
  unreadCount: number;
}

export interface PublicMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
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

export function listMyThreads(accessToken: string) {
  return request<{ threads: PublicThreadSummary[] }>(accessToken, "/messaging/threads");
}

export function getThreadWith(accessToken: string, otherUserId: string) {
  return request<{ thread: PublicThread | null }>(
    accessToken,
    `/messaging/threads/with/${otherUserId}`,
  );
}

export function getThread(accessToken: string, threadId: string) {
  return request<{ thread: PublicThread; messages: PublicMessage[] }>(
    accessToken,
    `/messaging/threads/${threadId}`,
  );
}

export function sendMessage(accessToken: string, threadId: string, input: SendMessageInput) {
  return request<PublicMessage>(accessToken, `/messaging/threads/${threadId}/messages`, {
    method: "POST",
    body: input,
  });
}
