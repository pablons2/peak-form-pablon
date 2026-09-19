"use server";

// Server actions backing the public auth flows (PRD 01 §5.1–§5.5). Each one
// re-validates input with the shared zod schema — client-side validation is
// UX only; the API is the real boundary (base doc §9) — and maps the API
// result onto a small {ok, message} contract forms can render.
import {
  completeGoogleClientSignupSchema,
  completeGoogleProfessionalSignupSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupClientSchema,
  signupProfessionalSchema,
  verifyEmailSchema,
  type CompleteGoogleClientSignupInput,
  type CompleteGoogleProfessionalSignupInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
  type SignupClientInput,
  type SignupProfessionalInput,
} from "@peakform/validation";
import * as api from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

export async function signupClientAction(
  input: SignupClientInput,
): Promise<ActionResult> {
  const parsed = signupClientSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const result = await api.signupClient(parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function signupProfessionalAction(
  input: SignupProfessionalInput,
): Promise<ActionResult> {
  const parsed = signupProfessionalSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const result = await api.signupProfessional(parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success) return fail("Token inválido.");

  const result = await api.verifyEmail(parsed.data.token);
  if (!result.ok) {
    return fail(
      "Não foi possível verificar o email — o link pode ter expirado. Solicite um novo.",
    );
  }
  return { ok: true };
}

export async function requestPasswordResetAction(
  input: RequestPasswordResetInput,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) return fail("Informe um email válido.");

  // The API always answers the same way whether or not the email exists —
  // mirror that here so the UI can't leak account existence either.
  await api.requestPasswordReset(parsed.data);
  return { ok: true };
}

export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const result = await api.resetPassword(parsed.data);
  if (!result.ok) {
    return fail("Não foi possível redefinir a senha — o link pode ter expirado.");
  }
  return { ok: true };
}

export async function completeGoogleClientSignupAction(
  input: CompleteGoogleClientSignupInput,
): Promise<ActionResult> {
  const parsed = completeGoogleClientSignupSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const result = await api.completeGoogleClientSignup(parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}

export async function completeGoogleProfessionalSignupAction(
  input: CompleteGoogleProfessionalSignupInput,
): Promise<ActionResult> {
  const parsed = completeGoogleProfessionalSignupSchema.safeParse(input);
  if (!parsed.success) return fail("Dados inválidos — revise o formulário.");

  const result = await api.completeGoogleProfessionalSignup(parsed.data);
  if (!result.ok) return fail(result.message);
  return { ok: true };
}
