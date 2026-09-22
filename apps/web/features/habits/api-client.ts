// Typed server-side client for the Productivity/Habits endpoints (PRD 10).
// Same conventions as features/nutrition/api-client.ts — every call is
// Bearer-authenticated, results come back as the {ok,data}/{ok:false} union.
import type {
  CreateHabitInput,
  CreateTaskInput,
  UpdateHabitInput,
  UpdateTaskInput,
  WeekdayInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export type HabitCadence = "DAILY" | "SPECIFIC_WEEKDAYS";

export interface PublicHabit {
  id: string;
  clientId: string;
  name: string;
  cadence: HabitCadence;
  weekdays: WeekdayInput[];
  reminderTime: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface HabitWithStatus extends PublicHabit {
  streak: number;
  checkedToday: boolean;
}

export interface PublicHabitCheckIn {
  id: string;
  habitDefinitionId: string;
  date: string;
  checkedAt: string;
}

export interface PublicTask {
  id: string;
  clientId: string;
  text: string;
  dueDate: string | null;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface TodayProductivity {
  habits: HabitWithStatus[];
  tasks: PublicTask[];
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

export function createHabit(accessToken: string, input: CreateHabitInput) {
  return request<PublicHabit>(accessToken, "/habits", { method: "POST", body: input });
}

// GET /habits returns a bare array (same convention as
// GET /nutrition/food/search), not a wrapped { habits } — normalize here.
export async function listHabits(accessToken: string): Promise<ApiResult<HabitWithStatus[]>> {
  const result = await request<HabitWithStatus[] | { habits: HabitWithStatus[] }>(
    accessToken,
    "/habits",
  );
  if (!result.ok) return result;
  const habits = Array.isArray(result.data) ? result.data : result.data.habits;
  return { ok: true, data: habits };
}

export function updateHabit(accessToken: string, habitId: string, input: UpdateHabitInput) {
  return request<PublicHabit>(accessToken, `/habits/${habitId}`, {
    method: "PATCH",
    body: input,
  });
}

export function checkInHabit(accessToken: string, habitId: string, date?: string) {
  return request<PublicHabitCheckIn>(accessToken, `/habits/${habitId}/check-ins`, {
    method: "POST",
    body: { date },
  });
}

export function uncheckHabit(accessToken: string, habitId: string, date: string) {
  return request<Record<string, never>>(
    accessToken,
    `/habits/${habitId}/check-ins/${date}`,
    { method: "DELETE" },
  );
}

export function createTask(accessToken: string, input: CreateTaskInput) {
  return request<PublicTask>(accessToken, "/tasks", { method: "POST", body: input });
}

// The contract leaves the list shape ambiguous ("may be a bare array") — stay
// tolerant of both a bare PublicTask[] and { tasks: PublicTask[] } rather
// than trusting either shape blindly.
export async function listTasks(accessToken: string): Promise<ApiResult<PublicTask[]>> {
  const result = await request<PublicTask[] | { tasks: PublicTask[] }>(accessToken, "/tasks");
  if (!result.ok) return result;
  const tasks = Array.isArray(result.data) ? result.data : result.data.tasks;
  return { ok: true, data: tasks };
}

export function updateTask(accessToken: string, taskId: string, input: UpdateTaskInput) {
  return request<PublicTask>(accessToken, `/tasks/${taskId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteTask(accessToken: string, taskId: string) {
  return request<Record<string, never>>(accessToken, `/tasks/${taskId}`, { method: "DELETE" });
}

export function getToday(accessToken: string) {
  return request<TodayProductivity>(accessToken, "/productivity/today");
}

