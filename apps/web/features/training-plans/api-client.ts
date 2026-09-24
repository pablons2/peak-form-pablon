// Typed server-side client for the Training Plan Builder endpoints (PRD 06).
// Same conventions as features/intake/api-client.ts.
import type {
  ClonePlanInput,
  CloneMesocycleInput,
  CreateMesocycleInput,
  CreateStarterTemplateInput,
  CreateTrainingPlanInput,
  MesocycleGoalInput,
  MoveSessionInput,
  PrescriptionExerciseInput,
  ReplaceSessionExercisesInput,
  SaveWeeklyTemplateInput,
  TrainingPlanStatusInput,
  UpdateMesocycleInput,
  UpdateTrainingPlanInput,
  WeekdayInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export interface PublicPrescriptionExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  contraindicationTagCodes: string[];
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
}

export interface PublicWeeklyTemplate {
  id: string;
  weekday: WeekdayInput;
  name: string;
  exercises: PublicPrescriptionExercise[];
}

export interface PublicMesocycle {
  id: string;
  trainingPlanId: string;
  order: number;
  weeks: number;
  goal: MesocycleGoalInput;
  isDeload: boolean;
  weeklyTemplates: PublicWeeklyTemplate[];
}

export interface PublicTrainingPlan {
  id: string;
  clientId: string | null;
  professionalId: string | null;
  authoredById: string | null;
  name: string;
  startDate: string;
  status: TrainingPlanStatusInput;
  isStarterTemplate: boolean;
  createdAt: string;
  mesocycles: PublicMesocycle[];
}

export interface PublicSession {
  id: string;
  mesocycleId: string;
  /** Owning client id — present on GET /sessions/:id (used for intake fetch). */
  clientId?: string;
  date: string;
  originalDate: string | null;
  status: "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
  overriddenFromTemplate: boolean;
  sessionExercises: PublicPrescriptionExercise[];
}

export interface ContraindicationWarning {
  exerciseId: string;
  exerciseName: string;
  matchedTags: string[];
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

export function createTrainingPlan(accessToken: string, input: CreateTrainingPlanInput) {
  return request<PublicTrainingPlan>(accessToken, "/training-plans", {
    method: "POST",
    body: input,
  });
}

export function createStarterTemplate(
  accessToken: string,
  input: CreateStarterTemplateInput,
) {
  return request<PublicTrainingPlan>(accessToken, "/training-plans/starter-templates", {
    method: "POST",
    body: input,
  });
}

export function assignStarterTemplate(accessToken: string, templateId: string) {
  return request<PublicTrainingPlan>(
    accessToken,
    `/training-plans/starter-templates/${templateId}/assign`,
    { method: "POST" },
  );
}

export function listStarterTemplates(accessToken: string) {
  return request<PublicTrainingPlan[]>(accessToken, "/training-plans/starter-templates");
}

export function listMyTrainingPlans(accessToken: string) {
  return request<PublicTrainingPlan[]>(accessToken, "/training-plans/mine");
}

export function listClientTrainingPlans(accessToken: string, clientId: string) {
  return request<PublicTrainingPlan[]>(
    accessToken,
    `/training-plans?clientId=${encodeURIComponent(clientId)}`,
  );
}

export function getTrainingPlan(accessToken: string, planId: string) {
  return request<PublicTrainingPlan>(accessToken, `/training-plans/${planId}`);
}

export function updateTrainingPlan(
  accessToken: string,
  planId: string,
  input: UpdateTrainingPlanInput,
) {
  return request<PublicTrainingPlan>(accessToken, `/training-plans/${planId}`, {
    method: "PATCH",
    body: input,
  });
}

export function clonePlan(accessToken: string, planId: string, input: ClonePlanInput) {
  return request<PublicTrainingPlan>(accessToken, `/training-plans/${planId}/clone`, {
    method: "POST",
    body: input,
  });
}

export function createMesocycle(
  accessToken: string,
  planId: string,
  input: CreateMesocycleInput,
) {
  return request<PublicMesocycle>(accessToken, `/training-plans/${planId}/mesocycles`, {
    method: "POST",
    body: input,
  });
}

export function updateMesocycle(
  accessToken: string,
  mesocycleId: string,
  input: UpdateMesocycleInput,
) {
  return request<PublicMesocycle>(accessToken, `/mesocycles/${mesocycleId}`, {
    method: "PATCH",
    body: input,
  });
}

export function cloneMesocycle(
  accessToken: string,
  mesocycleId: string,
  input: CloneMesocycleInput,
) {
  return request<PublicMesocycle>(accessToken, `/mesocycles/${mesocycleId}/clone`, {
    method: "POST",
    body: input,
  });
}

export function saveWeeklyTemplate(
  accessToken: string,
  mesocycleId: string,
  input: SaveWeeklyTemplateInput,
) {
  return request<{ mesocycle: PublicMesocycle; warnings: ContraindicationWarning[] }>(
    accessToken,
    `/mesocycles/${mesocycleId}/weekly-template`,
    { method: "POST", body: input },
  );
}

export function listSessions(accessToken: string, mesocycleId: string) {
  return request<PublicSession[]>(accessToken, `/mesocycles/${mesocycleId}/sessions`);
}

export function getSession(accessToken: string, sessionId: string) {
  return request<PublicSession>(accessToken, `/sessions/${sessionId}`);
}

export function moveSession(accessToken: string, sessionId: string, input: MoveSessionInput) {
  return request<PublicSession>(accessToken, `/sessions/${sessionId}/move`, {
    method: "POST",
    body: input,
  });
}

export function cancelSession(accessToken: string, sessionId: string) {
  return request<PublicSession>(accessToken, `/sessions/${sessionId}/cancel`, {
    method: "POST",
  });
}

export function replaceSessionExercises(
  accessToken: string,
  sessionId: string,
  input: ReplaceSessionExercisesInput,
) {
  return request<{ session: PublicSession; warnings: ContraindicationWarning[] }>(
    accessToken,
    `/sessions/${sessionId}/exercises`,
    { method: "PATCH", body: input },
  );
}

export type { PrescriptionExerciseInput };
