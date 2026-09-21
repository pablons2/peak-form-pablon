// Typed server-side client for the intake/onboarding endpoints (PRD 03).
// Same conventions as features/exercises/api-client.ts — every call is
// Bearer-authenticated with the caller's NextAuth-held access token, and
// results come back as the {ok,data}/{ok:false,status,message} union.
import type {
  AddProfessionalAnnotationInput,
  BodyRegionInput,
  MedicalConditionInput,
  SkipIntakeInput,
  UpdateIntakeInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export type IntakeStatus = "IN_PROGRESS" | "COMPLETED" | "SKIPPED_WITH_ACKNOWLEDGEMENT";

export interface PublicPainFlag {
  id: string;
  region: BodyRegionInput;
  severity: number;
  pastOrCurrent: "PAST" | "CURRENT";
}

export interface PublicAnnotation {
  id: string;
  note: string;
  createdAt: string;
  professional: { id: string; fullName: string; email: string };
}

export interface PublicIntake {
  id: string;
  clientId: string;
  version: number;
  status: IntakeStatus;
  parqAnswers: Record<string, boolean> | null;
  painFlags: PublicPainFlag[];
  medicalConditions: MedicalConditionInput[];
  medicalConditionsOtherNote: string | null;
  medications: string | null;
  availability: { daysPerWeek: number; sessionDurationMinutes: number } | null;
  equipmentAccess: { location: "HOME" | "GYM"; homeEquipment: string[] } | null;
  contraindicationTagCodes: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  annotations?: PublicAnnotation[];
}

export interface IntakeWithGating {
  intake: PublicIntake | null;
  planAssignmentAllowed: boolean;
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

export function getMyIntake(accessToken: string) {
  return request<IntakeWithGating>(accessToken, "/intake/mine");
}

export function startOrResumeIntake(accessToken: string) {
  return request<PublicIntake>(accessToken, "/intake", { method: "POST" });
}

export function updateIntake(
  accessToken: string,
  intakeId: string,
  input: UpdateIntakeInput,
) {
  return request<PublicIntake>(accessToken, `/intake/${intakeId}`, {
    method: "PATCH",
    body: input,
  });
}

export function completeIntake(accessToken: string, intakeId: string) {
  return request<PublicIntake>(accessToken, `/intake/${intakeId}/complete`, {
    method: "POST",
  });
}

export function skipIntake(
  accessToken: string,
  intakeId: string,
  input: SkipIntakeInput,
) {
  return request<PublicIntake>(accessToken, `/intake/${intakeId}/skip`, {
    method: "POST",
    body: input,
  });
}

export function getClientIntake(accessToken: string, clientId: string) {
  return request<IntakeWithGating>(accessToken, `/intake/clients/${clientId}`);
}

export function listClientIntakeVersions(accessToken: string, clientId: string) {
  return request<PublicIntake[]>(
    accessToken,
    `/intake/clients/${clientId}/versions`,
  );
}

export function addProfessionalAnnotation(
  accessToken: string,
  intakeAssessmentId: string,
  input: AddProfessionalAnnotationInput,
) {
  return request<PublicAnnotation>(
    accessToken,
    `/intake/${intakeAssessmentId}/annotations`,
    { method: "POST", body: input },
  );
}
