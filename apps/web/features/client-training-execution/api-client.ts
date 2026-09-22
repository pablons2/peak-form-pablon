// Typed server-side client for Client Training Execution (PRD 07). Same
// request/ApiResult conventions as features/training-plans/api-client.ts.
import type { LogSetInput } from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export interface PublicExerciseLog {
  id: string;
  setNumber: number;
  actualReps: number;
  actualLoad: number | null;
  actualRpeOrRir: number | null;
  note: string | null;
  loggedAt: string;
}

export interface LastTimeReference {
  actualReps: number;
  actualLoad: number | null;
  actualRpeOrRir: number | null;
  sessionDate: string;
}

export interface PublicSessionExerciseExecution {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number | null;
  targetLoad: number | null;
  targetPercent1RM: number | null;
  targetRpe: number | null;
  targetRir: number | null;
  restSeconds: number | null;
  tempo: string | null;
  notes: string | null;
  logs: PublicExerciseLog[];
  lastTime: LastTimeReference | null;
}

export interface PublicSessionExecution {
  id: string;
  mesocycleId: string;
  date: string;
  originalDate: string | null;
  status: "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
  overriddenFromTemplate: boolean;
  exercises: PublicSessionExerciseExecution[];
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

export function getTodaySession(accessToken: string) {
  return request<{ session: PublicSessionExecution | null; isRestDay: boolean }>(
    accessToken,
    "/training-execution/today",
  );
}

export function listMySessions(accessToken: string) {
  return request<PublicSessionExecution[]>(accessToken, "/training-execution/sessions");
}

export function logSet(
  accessToken: string,
  sessionId: string,
  sessionExerciseId: string,
  input: LogSetInput,
) {
  return request<PublicSessionExecution>(
    accessToken,
    `/training-execution/sessions/${sessionId}/exercises/${sessionExerciseId}/logs`,
    { method: "POST", body: input },
  );
}

export function completeSession(accessToken: string, sessionId: string) {
  return request<PublicSessionExecution>(
    accessToken,
    `/training-execution/sessions/${sessionId}/complete`,
    { method: "POST" },
  );
}

export function listClientSessions(accessToken: string, clientId: string) {
  return request<PublicSessionExecution[]>(
    accessToken,
    `/training-execution/clients/${encodeURIComponent(clientId)}/sessions`,
  );
}
