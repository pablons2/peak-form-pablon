"use server";

// Server actions for the Training Plan Builder (PRD 06). Same contract as
// features/intake/actions.ts: re-validate with the shared zod schema,
// attach the session access token, map the API result onto {ok, message}.
import { getServerSession } from "next-auth";
import {
  clonePlanSchema,
  cloneMesocycleSchema,
  createMesocycleSchema,
  createStarterTemplateSchema,
  createTrainingPlanSchema,
  moveSessionSchema,
  replaceSessionExercisesSchema,
  saveWeeklyTemplateSchema,
  updateMesocycleSchema,
  updateTrainingPlanSchema,
  type ClonePlanInput,
  type CloneMesocycleInput,
  type CreateMesocycleInput,
  type CreateStarterTemplateInput,
  type CreateTrainingPlanInput,
  type MoveSessionInput,
  type ReplaceSessionExercisesInput,
  type SaveWeeklyTemplateInput,
  type UpdateMesocycleInput,
  type UpdateTrainingPlanInput,
} from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";
import type { ContraindicationWarning } from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
  id?: string;
  warnings?: ContraindicationWarning[];
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function requireAccessToken(): Promise<
  { ok: true; token: string } | { ok: false; result: ActionResult }
> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { ok: false, result: fail("Sessão expirada — entre novamente.") };
  }
  return { ok: true, token: session.accessToken };
}

export async function createTrainingPlanAction(
  input: CreateTrainingPlanInput,
): Promise<ActionResult> {
  const parsed = createTrainingPlanSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.createTrainingPlan(auth.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function createStarterTemplateAction(
  input: CreateStarterTemplateInput,
): Promise<ActionResult> {
  const parsed = createStarterTemplateSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.createStarterTemplate(auth.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function assignStarterTemplateAction(templateId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.assignStarterTemplate(auth.token, templateId);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function updateTrainingPlanAction(
  planId: string,
  input: UpdateTrainingPlanInput,
): Promise<ActionResult> {
  const parsed = updateTrainingPlanSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.updateTrainingPlan(auth.token, planId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function clonePlanAction(
  planId: string,
  input: ClonePlanInput,
): Promise<ActionResult> {
  const parsed = clonePlanSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.clonePlan(auth.token, planId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function createMesocycleAction(
  planId: string,
  input: CreateMesocycleInput,
): Promise<ActionResult> {
  const parsed = createMesocycleSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.createMesocycle(auth.token, planId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function updateMesocycleAction(
  mesocycleId: string,
  input: UpdateMesocycleInput,
): Promise<ActionResult> {
  const parsed = updateMesocycleSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.updateMesocycle(auth.token, mesocycleId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function cloneMesocycleAction(
  mesocycleId: string,
  input: CloneMesocycleInput,
): Promise<ActionResult> {
  const parsed = cloneMesocycleSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.cloneMesocycle(auth.token, mesocycleId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function saveWeeklyTemplateAction(
  mesocycleId: string,
  input: SaveWeeklyTemplateInput,
): Promise<ActionResult> {
  const parsed = saveWeeklyTemplateSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.saveWeeklyTemplate(auth.token, mesocycleId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.mesocycle.id, warnings: result.data.warnings };
}

export async function moveSessionAction(
  sessionId: string,
  input: MoveSessionInput,
): Promise<ActionResult> {
  const parsed = moveSessionSchema.safeParse(input);
  if (!parsed.success) return fail("Data inválida.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.moveSession(auth.token, sessionId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function cancelSessionAction(sessionId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.cancelSession(auth.token, sessionId);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function replaceSessionExercisesAction(
  sessionId: string,
  input: ReplaceSessionExercisesInput,
): Promise<ActionResult> {
  const parsed = replaceSessionExercisesSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.replaceSessionExercises(auth.token, sessionId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.session.id, warnings: result.data.warnings };
}
