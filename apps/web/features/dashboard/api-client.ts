// Typed server-side client for the Today/This Week Dashboard (PRD 09). Same
// conventions as the other feature api-clients — every call is
// Bearer-authenticated, results come back as the {ok,data}/{ok:false}
// union. Response shapes are deliberately built from each owning module's
// own public types (never a second, drifted copy) — this module reshapes
// nothing, it only composes.
import { apiBaseUrl } from "../auth/api-client";
import type { PublicSessionExecution } from "../client-training-execution/api-client";
import type { DailyDiaryResult } from "../nutrition/api-client";
import type { HabitWithStatus, PublicTask } from "../habits/api-client";
import type { PublicThreadSummary } from "../messaging/api-client";

export interface TodayDashboard {
  training: { session: PublicSessionExecution | null; isRestDay: boolean };
  nutrition: DailyDiaryResult;
  habits: HabitWithStatus[];
  tasks: PublicTask[];
  messages: { unreadTotal: number; unreadThreads: PublicThreadSummary[] };
  checkInDue: string | null;
}

export type DaySessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED"
  | "REST";

export interface WeekDashboard {
  strip: Array<{ date: string; status: DaySessionStatus }>;
  trainingAdherence: { completed: number; scheduledTotal: number; percent: number | null };
  volumeTrend: {
    thisWeekTonnage: number;
    priorWeekTonnage: number;
    deltaPercent: number | null;
  };
  weightTrend: { latest: number | null; previous: number | null; deltaKg: number | null };
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

async function get<T>(accessToken: string, path: string): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: "API unreachable" };
  }
  const data = (await res.json().catch(() => ({}))) as T & { message?: string | string[] };
  if (!res.ok) return failure(res, data);
  return { ok: true, data };
}

export function getTodayDashboard(accessToken: string) {
  return get<TodayDashboard>(accessToken, "/dashboard/today");
}

export function getWeekDashboard(accessToken: string) {
  return get<WeekDashboard>(accessToken, "/dashboard/week");
}
