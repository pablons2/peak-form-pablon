"use server";

// Server actions for the exercise library (PRD 05). Same contract as
// features/relationships/actions.ts: re-validate with the shared zod schema,
// attach the session access token, map the API result onto {ok, message}.
import { getServerSession } from "next-auth";
import {
  createCustomExerciseSchema,
  updateExerciseSchema,
  type CreateCustomExerciseInput,
  type UpdateExerciseInput,
} from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
  /// The created/updated exercise id — forms redirect to its detail view.
  id?: string;
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

export async function createCustomExerciseAction(
  input: CreateCustomExerciseInput,
): Promise<ActionResult> {
  const parsed = createCustomExerciseSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.createCustomExercise(auth.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function updateCustomExerciseAction(
  exerciseId: string,
  input: UpdateExerciseInput,
): Promise<ActionResult> {
  const parsed = updateExerciseSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.updateCustomExercise(
    auth.token,
    exerciseId,
    parsed.data,
  );
  if (!result.ok) return fail(result.message);
  return { ok: true, id: result.data.id };
}

export async function deleteCustomExerciseAction(
  exerciseId: string,
): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.deleteCustomExercise(auth.token, exerciseId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function promoteExerciseAction(
  exerciseId: string,
): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.adminPromoteExercise(auth.token, exerciseId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function adminDeleteExerciseAction(
  exerciseId: string,
): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.adminDeleteExercise(auth.token, exerciseId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}
