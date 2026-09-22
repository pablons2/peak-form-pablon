// Typed server-side client for the Nutrition Module endpoints (PRD 08).
// Same conventions as features/body-assessments/api-client.ts — every call
// is Bearer-authenticated, results come back as the {ok,data}/{ok:false}
// union.
import type {
  ActivityLevelInput,
  ConfirmNutritionPlanInput,
  LogFoodDiaryEntryInput,
} from "@peakform/validation";
import { apiBaseUrl } from "../auth/api-client";

export type NutritionPlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface PublicNutritionPlan {
  id: string;
  clientId: string;
  nutritionistId: string;
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fat: number };
  status: NutritionPlanStatus;
  confirmedByProfessionalAt: string | null;
  mealPlan: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFoodItemCache {
  id: string;
  source: "OPEN_FOOD_FACTS" | "USDA" | "CUSTOM";
  externalId: string;
  name: string;
  nutrients: { calories: number; protein: number; carbs: number; fat: number };
}

export interface PublicFoodDiaryEntry {
  id: string;
  clientId: string;
  foodItemCacheId: string | null;
  customFoodName: string | null;
  quantity: number;
  mealSlot: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  loggedAt: string;
  nutrientsSnapshot: { calories: number; protein: number; carbs: number; fat: number };
}

export interface DailyDiaryResult {
  entries: PublicFoodDiaryEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  activeTarget: PublicNutritionPlan | null;
  nudges: Array<{ code: string; message: string }>;
}

export interface WeeklyAdherenceSummary {
  daysLogged: number;
  averageAdherencePercent: number;
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

export function generateDraft(
  accessToken: string,
  clientId: string,
  activityLevel?: ActivityLevelInput,
) {
  return request<PublicNutritionPlan>(accessToken, `/nutrition/clients/${clientId}/draft`, {
    method: "POST",
    body: { activityLevel },
  });
}

export function confirmPlan(
  accessToken: string,
  planId: string,
  input: ConfirmNutritionPlanInput,
) {
  return request<PublicNutritionPlan>(accessToken, `/nutrition/plans/${planId}/confirm`, {
    method: "POST",
    body: input,
  });
}

export function getClientPlan(accessToken: string, clientId: string) {
  return request<{ plan: PublicNutritionPlan | null }>(
    accessToken,
    `/nutrition/clients/${clientId}/plan`,
  );
}

export function getMyPlan(accessToken: string) {
  return request<{ plan: PublicNutritionPlan | null }>(accessToken, "/nutrition/mine/plan");
}

export function lookupBarcode(accessToken: string, barcode: string) {
  return request<{ item: PublicFoodItemCache | null }>(
    accessToken,
    `/nutrition/food/barcode/${encodeURIComponent(barcode)}`,
  );
}

export function searchFood(accessToken: string, query: string) {
  return request<PublicFoodItemCache[]>(
    accessToken,
    `/nutrition/food/search?query=${encodeURIComponent(query)}`,
  );
}

export function logDiaryEntry(accessToken: string, input: LogFoodDiaryEntryInput) {
  return request<PublicFoodDiaryEntry>(accessToken, "/nutrition/diary", {
    method: "POST",
    body: input,
  });
}

export function getMyDiary(accessToken: string, date?: string) {
  return request<DailyDiaryResult>(
    accessToken,
    `/nutrition/mine/diary${date ? `?date=${date}` : ""}`,
  );
}

export function getClientDiary(accessToken: string, clientId: string, date?: string) {
  return request<DailyDiaryResult>(
    accessToken,
    `/nutrition/clients/${clientId}/diary${date ? `?date=${date}` : ""}`,
  );
}

export function logHydration(accessToken: string, amount: number) {
  return request<{ date: string; amount: number }>(accessToken, "/nutrition/hydration", {
    method: "POST",
    body: { amount },
  });
}

export function getMyHydration(accessToken: string, date?: string) {
  return request<{ date: string; amount: number }>(
    accessToken,
    `/nutrition/mine/hydration${date ? `?date=${date}` : ""}`,
  );
}

export function getMyWeeklySummary(accessToken: string) {
  return request<WeeklyAdherenceSummary>(accessToken, "/nutrition/mine/weekly-summary");
}

export function getClientWeeklySummary(accessToken: string, clientId: string) {
  return request<WeeklyAdherenceSummary>(
    accessToken,
    `/nutrition/clients/${clientId}/weekly-summary`,
  );
}
