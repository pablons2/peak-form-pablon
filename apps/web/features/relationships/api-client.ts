// Typed server-side client for the relationship endpoints (PRD 02). Every
// call carries the caller's NextAuth-held access token as a Bearer header —
// these routes are authenticated, unlike auth's public signup/login surface.
import type {
  CreateCheckInScheduleInput,
  InviteClientInput,
  RequestProfessionalInput,
  UpdateCheckInScheduleInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export interface PublicParty {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "PROFESSIONAL" | "CLIENT";
}

export type LinkStatus = "PENDING" | "ACTIVE" | "DECLINED" | "EXPIRED" | "UNLINKED";
export type Specialization = "PERSONAL_TRAINER" | "NUTRITIONIST";

export interface PublicLink {
  id: string;
  specialization: Specialization;
  status: LinkStatus;
  invitedBy: "PROFESSIONAL" | "CLIENT";
  expiresAt: string | null;
  linkedAt: string | null;
  unlinkedAt: string | null;
  unlinkedById?: string | null;
  createdAt: string;
  professional: PublicParty;
  client: PublicParty;
}

export interface CheckInSchedule {
  id: string;
  linkId: string;
  type: "ONE_OFF" | "RECURRING";
  cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | null;
  anchor: number | null;
  dueDate: string | null;
  nextDueAt: string | null;
  note: string | null;
  status: "ACTIVE" | "FIRED" | "CANCELLED";
  createdById: string;
  lastFiredAt: string | null;
  createdAt: string;
}

// Same discriminated shape as auth/api-client.ts's ApiResult — callers render
// the right message without parsing NestJS error bodies.
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

export function inviteClient(accessToken: string, input: InviteClientInput) {
  return request<PublicLink[]>(accessToken, "/links/invites", {
    method: "POST",
    body: input,
  });
}

export function requestProfessional(
  accessToken: string,
  input: RequestProfessionalInput,
) {
  return request<PublicLink>(accessToken, "/links/requests", {
    method: "POST",
    body: input,
  });
}

export function listMyLinks(accessToken: string, status?: LinkStatus) {
  const qs = status ? `?status=${status}` : "";
  return request<PublicLink[]>(accessToken, `/links/mine${qs}`);
}

export function acceptLink(accessToken: string, linkId: string) {
  return request<PublicLink>(accessToken, `/links/${linkId}/accept`, {
    method: "POST",
  });
}

export function declineLink(accessToken: string, linkId: string) {
  return request<PublicLink>(accessToken, `/links/${linkId}/decline`, {
    method: "POST",
  });
}

export function unlinkLink(accessToken: string, linkId: string) {
  return request<PublicLink>(accessToken, `/links/${linkId}/unlink`, {
    method: "POST",
  });
}

export function listCheckInSchedules(accessToken: string, linkId: string) {
  return request<CheckInSchedule[]>(accessToken, `/links/${linkId}/check-ins`);
}

export function createCheckInSchedule(
  accessToken: string,
  linkId: string,
  data: CreateCheckInScheduleInput,
) {
  return request<CheckInSchedule>(accessToken, `/links/${linkId}/check-ins`, {
    method: "POST",
    body: data,
  });
}

export function updateCheckInSchedule(
  accessToken: string,
  linkId: string,
  scheduleId: string,
  data: UpdateCheckInScheduleInput,
) {
  return request<CheckInSchedule>(
    accessToken,
    `/links/${linkId}/check-ins/${scheduleId}`,
    { method: "PATCH", body: data },
  );
}

export function cancelCheckInSchedule(
  accessToken: string,
  linkId: string,
  scheduleId: string,
) {
  return request<CheckInSchedule>(
    accessToken,
    `/links/${linkId}/check-ins/${scheduleId}/cancel`,
    { method: "POST" },
  );
}

export interface ClientIntake {
  id: string;
  clientId: string;
  version: number;
  status: string;
  parqAnswers: Record<string, unknown>;
  // Mirrors the API's PainFlag rows (apps/api intake.serializer) — region is
  // the BodyRegion code; pt-BR labels live in features/intake/labels.ts.
  painFlags: Array<{ region: string; severity: number; pastOrCurrent: string }>;
  medicalConditions: string[];
  medicalConditionsOtherNote: string | null;
  medications: string[];
  availability: Record<string, unknown>;
  equipmentAccess: Record<string, unknown>;
  contraindicationTagCodes: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  annotations: Array<{
    id: string;
    note: string;
    createdAt: string;
    professional: PublicParty;
  }>;
}

export function getClientIntake(accessToken: string, clientId: string) {
  return request<{ intake: ClientIntake | null; planAssignmentAllowed: boolean }>(
    accessToken,
    `/intake/clients/${clientId}`,
  );
}
