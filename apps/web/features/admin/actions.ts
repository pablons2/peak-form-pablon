"use server";

// Server actions for the Admin Console (PRD 13). Same contract as
// features/exercises/actions.ts: attach the session access token, map the
// API result onto {ok, message}.
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
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

export async function deactivateUserAction(userId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.deactivateUser(auth.token, userId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function reactivateUserAction(userId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.reactivateUser(auth.token, userId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function approveProfessionalAction(userId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.approveProfessional(auth.token, userId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function rejectProfessionalAction(
  userId: string,
  reason?: string,
): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.rejectProfessional(auth.token, userId, reason);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function forceUnlinkAction(linkId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;
  const result = await api.forceUnlink(auth.token, linkId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}
