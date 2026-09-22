"use server";

// Server actions for Client Training Execution (PRD 07). Same contract as
// features/body-assessments/actions.ts: re-validate with the shared zod
// schema, attach the session access token, map the API result onto
// {ok, message}.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { logSetSchema, type LogSetInput } from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";
import type { PublicSessionExecution } from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
  session?: PublicSessionExecution;
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return null;
  return { token: session.accessToken };
}

export async function getTodaySessionAction() {
  const session = await requireSession();
  if (!session) return { session: null, isRestDay: true };
  const result = await api.getTodaySession(session.token);
  return result.ok ? result.data : { session: null, isRestDay: true };
}

export async function getMySessionsAction() {
  const session = await requireSession();
  if (!session) return [];
  const result = await api.listMySessions(session.token);
  return result.ok ? result.data : [];
}

// §5.2 — logs one set; the response session already reflects any
// auto-completion (§5.3), so the UI never needs a second round trip to find
// out.
export async function logSetAction(
  sessionId: string,
  sessionExerciseId: string,
  input: {
    actualReps: number;
    actualLoad?: number | null;
    actualRpeOrRir?: number | null;
    note?: string | null;
  },
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");

  const parsed = logSetSchema.safeParse({
    actualReps: input.actualReps,
    actualLoad: input.actualLoad ?? null,
    actualRpeOrRir: input.actualRpeOrRir ?? null,
    note: input.note ?? null,
  } satisfies LogSetInput);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const result = await api.logSet(session.token, sessionId, sessionExerciseId, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath("/today");
  return { ok: true, session: result.data };
}

export async function completeSessionAction(sessionId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.completeSession(session.token, sessionId);
  if (!result.ok) return fail(result.message);
  revalidatePath("/today");
  return { ok: true, session: result.data };
}

export async function getClientSessionsAction(clientId: string) {
  const session = await requireSession();
  if (!session) return [];
  const result = await api.listClientSessions(session.token, clientId);
  return result.ok ? result.data : [];
}
