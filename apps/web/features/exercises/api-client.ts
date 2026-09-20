// Typed server-side client for the exercise library endpoints (PRD 05).
// Same conventions as features/relationships/api-client.ts — every call is
// Bearer-authenticated with the caller's NextAuth-held access token, and
// results come back as the {ok,data}/{ok:false,status,message} union.
import type {
  CreateCustomExerciseInput,
  DifficultyInput,
  EquipmentInput,
  MuscleGroupInput,
  UpdateExerciseInput,
  UpsertExerciseAsAdminInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export interface PublicContraindicationTag {
  code: string;
  label: string;
  description: string;
}

export interface PublicExercise {
  id: string;
  name: string;
  mediaUrl: string | null;
  muscleGroups: MuscleGroupInput[];
  equipment: EquipmentInput[];
  difficulty: DifficultyInput;
  cues: string[];
  mistakes: string[];
  visibility: "GLOBAL" | "PRIVATE";
  ownerProfessionalId: string | null;
  sourceApiId: string | null;
  createdAt: string;
  contraindicationTags: PublicContraindicationTag[];
  owner: { id: string; fullName: string; email: string } | null;
}

export interface ExerciseSearchFilters {
  q?: string;
  muscleGroup?: string;
  equipment?: string;
  difficulty?: string;
}

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

export function searchExercises(
  accessToken: string,
  filters: ExerciseSearchFilters = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return request<PublicExercise[]>(
    accessToken,
    `/exercises${qs ? `?${qs}` : ""}`,
  );
}

export function getExercise(accessToken: string, exerciseId: string) {
  return request<PublicExercise>(accessToken, `/exercises/${exerciseId}`);
}

export function listContraindicationTags(accessToken: string) {
  return request<PublicContraindicationTag[]>(
    accessToken,
    "/exercises/contraindication-tags",
  );
}

export function listMyExercises(accessToken: string) {
  return request<PublicExercise[]>(accessToken, "/exercises/mine");
}

export function createCustomExercise(
  accessToken: string,
  input: CreateCustomExerciseInput,
) {
  return request<PublicExercise>(accessToken, "/exercises/custom", {
    method: "POST",
    body: input,
  });
}

export function updateCustomExercise(
  accessToken: string,
  exerciseId: string,
  input: UpdateExerciseInput,
) {
  return request<PublicExercise>(accessToken, `/exercises/custom/${exerciseId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteCustomExercise(accessToken: string, exerciseId: string) {
  return request<void>(accessToken, `/exercises/custom/${exerciseId}`, {
    method: "DELETE",
  });
}

// --- Admin endpoints (PRD 05 §5.3 review queue + direct curation) ---

export function adminListExercises(
  accessToken: string,
  visibility?: "PRIVATE" | "GLOBAL",
) {
  const qs = visibility ? `?visibility=${visibility}` : "";
  return request<PublicExercise[]>(accessToken, `/admin/exercises${qs}`);
}

export function adminCreateExercise(
  accessToken: string,
  input: UpsertExerciseAsAdminInput,
) {
  return request<PublicExercise>(accessToken, "/admin/exercises", {
    method: "POST",
    body: input,
  });
}

export function adminPromoteExercise(
  accessToken: string,
  exerciseId: string,
) {
  return request<PublicExercise>(
    accessToken,
    `/admin/exercises/${exerciseId}/promote`,
    { method: "POST" },
  );
}

export function adminDeleteExercise(accessToken: string, exerciseId: string) {
  return request<void>(accessToken, `/admin/exercises/${exerciseId}`, {
    method: "DELETE",
  });
}
