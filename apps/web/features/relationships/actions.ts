"use server";

// Server actions backing the relationship flows (PRD 02 §5.1–§5.6). Each one
// re-validates input with the shared zod schema (client-side validation is UX
// only — the API is the real boundary, base doc §9), attaches the caller's
// session access token, and maps the API result onto a small {ok, message}
// contract components can render. None of these routes are public — every
// action first requires a live NextAuth session.
import { getServerSession } from "next-auth";
import {
  createCheckInScheduleSchema,
  inviteClientSchema,
  requestProfessionalSchema,
  updateCheckInScheduleSchema,
  type CreateCheckInScheduleInput,
  type InviteClientInput,
  type RequestProfessionalInput,
  type UpdateCheckInScheduleInput,
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

async function requireAccessToken(): Promise<
  { ok: true; token: string } | { ok: false; result: ActionResult }
> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { ok: false, result: fail("Sessão expirada — entre novamente.") };
  }
  return { ok: true, token: session.accessToken };
}

export async function inviteClientAction(
  input: InviteClientInput,
): Promise<ActionResult> {
  const parsed = inviteClientSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.inviteClient(auth.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function requestProfessionalAction(
  input: RequestProfessionalInput,
): Promise<ActionResult> {
  const parsed = requestProfessionalSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.requestProfessional(auth.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function acceptLinkAction(linkId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.acceptLink(auth.token, linkId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function declineLinkAction(linkId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.declineLink(auth.token, linkId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function unlinkAction(linkId: string): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.unlinkLink(auth.token, linkId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function createCheckInScheduleAction(
  linkId: string,
  input: CreateCheckInScheduleInput,
): Promise<ActionResult> {
  const parsed = createCheckInScheduleSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.createCheckInSchedule(auth.token, linkId, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function updateCheckInScheduleAction(
  linkId: string,
  scheduleId: string,
  input: UpdateCheckInScheduleInput,
): Promise<ActionResult> {
  const parsed = updateCheckInScheduleSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.updateCheckInSchedule(
    auth.token,
    linkId,
    scheduleId,
    parsed.data,
  );
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function cancelCheckInScheduleAction(
  linkId: string,
  scheduleId: string,
): Promise<ActionResult> {
  const auth = await requireAccessToken();
  if (!auth.ok) return auth.result;

  const result = await api.cancelCheckInSchedule(auth.token, linkId, scheduleId);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}
