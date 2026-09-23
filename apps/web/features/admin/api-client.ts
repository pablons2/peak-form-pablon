// Typed server-side client for the Admin Console endpoints (PRD 13). Same
// conventions as features/exercises/api-client.ts — every call is
// Bearer-authenticated, results come back as the {ok,data}/{ok:false} union.
import { apiBaseUrl } from "../auth/api-client";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function failure<T>(
  res: Response,
  data: { message?: string | string[] },
): ApiResult<T> {
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
  if (res.status === 204) return { ok: true, data: undefined as T };
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string | string[];
  };
  if (!res.ok) return failure(res, data);
  return { ok: true, data };
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
  status: "ACTIVE" | "DEACTIVATED";
  emailVerified: boolean;
  createdAt: string;
  professionalProfile: {
    specializations: string[];
    approvalStatus: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
    verificationNote: string;
  } | null;
}

export interface UserListFilters {
  role?: "ADMIN" | "PROFESSIONAL" | "CLIENT";
  status?: "ACTIVE" | "DEACTIVATED";
  q?: string;
}

// --- §5.1 user list/search + lifecycle ---

export function listUsers(accessToken: string, filters: UserListFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return request<AdminUser[]>(accessToken, `/admin/users${qs ? `?${qs}` : ""}`);
}

export function deactivateUser(accessToken: string, userId: string) {
  return request<{ deactivated: true }>(accessToken, `/admin/users/${userId}/deactivate`, {
    method: "POST",
  });
}

export function reactivateUser(accessToken: string, userId: string) {
  return request<{ reactivated: true }>(accessToken, `/admin/users/${userId}/reactivate`, {
    method: "POST",
  });
}

// --- §5.2 professional approval queue ---

export interface PendingProfessional {
  id: string;
  userId: string;
  specializations: string[];
  verificationNote: string;
  createdAt: string;
  user: { id: string; email: string; fullName: string; emailVerified: boolean };
}

export function listPendingProfessionals(accessToken: string) {
  return request<PendingProfessional[]>(accessToken, "/admin/professionals/pending");
}

export function approveProfessional(accessToken: string, userId: string) {
  return request<{ id: string }>(accessToken, `/admin/professionals/${userId}/approve`, {
    method: "POST",
  });
}

export function rejectProfessional(accessToken: string, userId: string, reason?: string) {
  return request<{ id: string }>(accessToken, `/admin/professionals/${userId}/reject`, {
    method: "POST",
    body: { reason },
  });
}

// --- §5.4 relationship oversight ---

export interface AdminLink {
  id: string;
  specialization: string;
  status: string;
  invitedBy: string;
  expiresAt: string | null;
  linkedAt: string | null;
  unlinkedAt: string | null;
  createdAt: string;
  professional: { id: string; email: string; fullName: string; role: string };
  client: { id: string; email: string; fullName: string; role: string };
}

export function listLinks(accessToken: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return request<AdminLink[]>(accessToken, `/admin/links${qs}`);
}

export function forceUnlink(accessToken: string, linkId: string) {
  return request<AdminLink>(accessToken, `/admin/links/${linkId}/force-unlink`, {
    method: "POST",
  });
}

// --- §5.5 audit log ---

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; email: string; fullName: string; role: string };
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
}

export function getAuditLog(accessToken: string, filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return request<AuditLogEntry[]>(accessToken, `/admin/audit-log${qs ? `?${qs}` : ""}`);
}

// --- §5.6 aggregate analytics ---

export interface AdminAnalytics {
  activeClients: number;
  activeProfessionals: { total: number; bySpecialization: Record<string, number> };
  averageWeeklyTrainingAdherencePercent: number | null;
  averageWeeklyNutritionAdherencePercent: number | null;
}

export function getAnalytics(accessToken: string) {
  return request<AdminAnalytics>(accessToken, "/admin/analytics");
}
