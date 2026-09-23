"use server";

// Server actions for Notifications (PRD 12). Form-bound (progressive
// enhancement) where a plain form submission makes sense — the preferences
// form posts everything in one action; mark-read buttons bind as native
// <form action={...}> the same way messaging's composer does.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  registerPushSubscriptionSchema,
  unregisterPushSubscriptionSchema,
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
  return { token: session.accessToken };
}

const PAGE = "/notifications";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.markNotificationRead(session.token, id);
  if (!result.ok) return fail(result.message);
  revalidatePath(PAGE);
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.markAllNotificationsRead(session.token);
  if (!result.ok) return fail(result.message);
  revalidatePath(PAGE);
  return { ok: true };
}

// The preferences form submits every row at once: each checkbox pair posts
// `email:<type>`/`push:<type>` fields, and this action PUTs each
// preference-eligible type's toggles in sequence. Locked-email types are
// skipped server-side too (the API 400s them), but they're skipped here
// first so a legitimate submission never half-succeeds then fails.
export async function updateNotificationPreferencesAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");

  const current = await api.getMyPreferences(session.token);
  if (!current.ok) return fail(current.message);

  for (const pref of current.data.preferences) {
    if (pref.emailLocked) continue;
    const emailEnabled = formData.get(`email:${pref.type}`) === "on";
    const pushEnabled = formData.get(`push:${pref.type}`) === "on";
    const result = await api.updatePreference(session.token, pref.type, {
      emailEnabled,
      pushEnabled,
    });
    if (!result.ok) return fail(result.message);
  }
  revalidatePath(PAGE);
  return { ok: true };
}

export async function registerPushSubscriptionAction(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = registerPushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("Inscrição de push inválida.");
  const result = await api.registerPushSubscription(session.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function unregisterPushSubscriptionAction(input: {
  endpoint: string;
}): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = unregisterPushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("Inscrição de push inválida.");
  const result = await api.unregisterPushSubscription(session.token, parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}
