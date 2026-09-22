// Typed server-side client for the Body Assessment endpoints (PRD 04). Same
// conventions as features/intake/api-client.ts — every call is
// Bearer-authenticated with the caller's NextAuth-held access token, results
// come back as the {ok,data}/{ok:false,status,message} union.
import type {
  BodyAssessmentGoalTypeInput,
  CircumferencesInput,
  CreateFormalAssessmentInput,
  CreateSelfLogInput,
  PhotoTagInput,
  PostureScreeningInput,
  RequestPhotoUploadUrlInput,
  SkinfoldsInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export type BodyAssessmentSource = "SELF_REPORTED" | "PROFESSIONAL_VALIDATED";
export type BodyFatSource = "COMPUTED_POLLOCK7" | "MANUAL_OVERRIDE";

export interface PublicPhoto {
  tag: PhotoTagInput;
  url: string;
}

export interface PublicBodyAssessment {
  id: string;
  clientId: string;
  source: BodyAssessmentSource;
  validatedById: string | null;
  recordedAt: string;
  protocolVersion: string | null;
  weight: number;
  height: number | null;
  bmi: number | null;
  circumferences: CircumferencesInput | null;
  waistHipRatio: number | null;
  skinfolds: SkinfoldsInput | null;
  bodyFatPercent: number | null;
  bodyFatSource: BodyFatSource | null;
  bodyFatOverrideNote: string | null;
  postureScreening: PostureScreeningInput | null;
  photos: PublicPhoto[];
  goalType: BodyAssessmentGoalTypeInput | null;
  goalTargetValue: number | null;
  goalTargetDate: string | null;
  goalNote: string | null;
  note: string | null;
  createdAt: string;
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

export function createSelfLog(accessToken: string, input: CreateSelfLogInput) {
  return request<PublicBodyAssessment>(accessToken, "/body-assessments/self-log", {
    method: "POST",
    body: input,
  });
}

export function getMyBodyAssessments(accessToken: string) {
  return request<PublicBodyAssessment[]>(accessToken, "/body-assessments/mine");
}

export function createFormalAssessment(
  accessToken: string,
  clientId: string,
  input: CreateFormalAssessmentInput,
) {
  return request<PublicBodyAssessment>(
    accessToken,
    `/body-assessments/clients/${clientId}/formal`,
    { method: "POST", body: input },
  );
}

export function getClientBodyAssessments(accessToken: string, clientId: string) {
  return request<PublicBodyAssessment[]>(
    accessToken,
    `/body-assessments/clients/${clientId}`,
  );
}

export function requestPhotoUploadUrl(
  accessToken: string,
  clientId: string,
  input: RequestPhotoUploadUrlInput,
) {
  return request<{ uploadUrl: string; key: string }>(
    accessToken,
    `/body-assessments/clients/${clientId}/photo-upload-url`,
    { method: "POST", body: input },
  );
}
