"use server";

// Server actions for the intake/onboarding flow (PRD 03). Same contract as
// features/exercises/actions.ts: re-validate with the shared zod schema,
// attach the session access token, map the API result onto {ok, message}.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  addProfessionalAnnotationSchema,
  skipIntakeSchema,
  updateIntakeSchema,
  type AddProfessionalAnnotationInput,
  type SkipIntakeInput,
  type UpdateIntakeInput,
} from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";
import type { PublicIntake } from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
  intake?: PublicIntake;
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

export async function startOrResumeIntakeAction(): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.startOrResumeIntake(auth.token);
  if (!result.ok) return fail(result.message);
  return { ok: true, intake: result.data };
}

export async function updateIntakeAction(
  intakeId: string,
  input: UpdateIntakeInput,
): Promise<ActionResult> {
  const parsed = updateIntakeSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.updateIntake(auth.token, intakeId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true, intake: result.data };
}

export async function completeIntakeAction(intakeId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.completeIntake(auth.token, intakeId);
  if (!result.ok) return fail(result.message);
  revalidatePath("/intake");
  return { ok: true, intake: result.data };
}

export async function skipIntakeAction(
  intakeId: string,
  input: SkipIntakeInput,
): Promise<ActionResult> {
  const parsed = skipIntakeSchema.safeParse(input);
  if (!parsed.success) {
    return fail("É preciso confirmar a ciência do risco para pular a triagem.");
  }

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.skipIntake(auth.token, intakeId, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath("/intake");
  return { ok: true, intake: result.data };
}

export async function addProfessionalAnnotationAction(
  intakeAssessmentId: string,
  input: AddProfessionalAnnotationInput,
): Promise<ActionResult> {
  const parsed = addProfessionalAnnotationSchema.safeParse(input);
  if (!parsed.success) return fail("A anotação não pode estar vazia.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.addProfessionalAnnotation(
    auth.token,
    intakeAssessmentId,
    parsed.data,
  );
  if (!result.ok) return fail(result.message);
  return { ok: true };
}
