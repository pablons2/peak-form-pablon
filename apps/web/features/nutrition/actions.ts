"use server";

// Server actions for the Nutrition Module (PRD 08). Same contract as
// features/body-assessments/actions.ts — re-validate with the shared zod
// schema, attach the session access token, map the API result onto
// {ok, message}.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  confirmNutritionPlanSchema,
  logFoodDiaryEntrySchema,
  logHydrationSchema,
  type ActivityLevelInput,
  type ConfirmNutritionPlanInput,
  type LogFoodDiaryEntryInput,
  type LogHydrationInput,
} from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.user?.id) return null;
  return { token: session.accessToken, userId: session.user.id };
}

export async function generateDraftAction(
  clientId: string,
  activityLevel?: ActivityLevelInput,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.generateDraft(session.token, clientId, activityLevel);
  if (!result.ok) return fail(result.message);
  revalidatePath(`/clients`);
  return { ok: true };
}

export async function confirmPlanAction(
  planId: string,
  clientId: string,
  input: ConfirmNutritionPlanInput,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = confirmNutritionPlanSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  const result = await api.confirmPlan(session.token, planId, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath(`/clients`);
  revalidatePath(`/nutrition`);
  void clientId;
  return { ok: true };
}

export async function logDiaryEntryAction(
  input: LogFoodDiaryEntryInput,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = logFoodDiaryEntrySchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  const result = await api.logDiaryEntry(session.token, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function logHydrationAction(input: LogHydrationInput): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = logHydrationSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos.");
  const result = await api.logHydration(session.token, parsed.data.amount);
  if (!result.ok) return fail(result.message);
  revalidatePath("/nutrition");
  return { ok: true };
}

export async function lookupBarcodeAction(barcode: string) {
  const session = await requireSession();
  if (!session) return { ok: false as const, item: null };
  const result = await api.lookupBarcode(session.token, barcode);
  if (!result.ok) return { ok: false as const, item: null };
  return { ok: true as const, item: result.data.item };
}

export async function searchFoodAction(query: string) {
  const session = await requireSession();
  if (!session) return { ok: false as const, items: [] };
  const result = await api.searchFood(session.token, query);
  if (!result.ok) return { ok: false as const, items: [] };
  return { ok: true as const, items: result.data };
}
