"use server";

// Server actions for Messaging (PRD 11). sendMessageAction is bound as a
// native <form action={...}> (React's Server Function form-action binding,
// via useFormState in features/messaging/components/thread-view.tsx) rather
// than called imperatively from an onClick handler — a native form action
// works via progressive enhancement even before client hydration completes
// (the browser can submit it as a real form post), whereas a bare onClick
// call into a "use server" function requires React to have already
// hydrated and attached the listener. That gap was a real, reproducible bug
// here: under load, a click landing before hydration finished was silently
// dropped (no request fired at all).
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { sendMessageSchema } from "@peakform/validation";
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

export async function sendMessageAction(
  threadId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = sendMessageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return fail("Mensagem inválida.");
  const result = await api.sendMessage(session.token, threadId, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  return { ok: true };
}
