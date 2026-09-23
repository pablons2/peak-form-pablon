// PRD 01 — Authentication & Account Management input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// A password strong enough to matter, without being a UX obstacle course.
const passwordSchema = z
  .string()
  .min(10, "Senha deve ter no mínimo 10 caracteres")
  .max(128)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v), {
    message: "Senha deve conter letras maiúsculas, minúsculas e números",
  });

const emailSchema = z.string().trim().toLowerCase().email("Email inválido");

export const biologicalSexSchema = z.enum(["MALE", "FEMALE"]);

export const specializationSchema = z.enum([
  "PERSONAL_TRAINER",
  "NUTRITIONIST",
]);

// PRD 01 §5.1 — dateOfBirth/biologicalSex are required, not optional, so
// PRD 04/PRD 08's formulas never have to block on a missing field later.
export const signupClientSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, "Nome completo é obrigatório").max(200),
  dateOfBirth: z.coerce.date().max(new Date(), "Data de nascimento não pode ser no futuro"),
  biologicalSex: biologicalSexSchema,
});
export type SignupClientInput = z.infer<typeof signupClientSchema>;

// PRD 01 §5.1 — full name, requested specialization(s), and a free-text
// verification note (not a document upload — see PRD 01 §8).
export const signupProfessionalSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, "Nome completo é obrigatório").max(200),
  specializations: z.array(specializationSchema).min(1, "Selecione ao menos uma especialização").max(2),
  verificationNote: z.string().trim().min(1, "Descrição profissional é obrigatória").max(2000),
});
export type SignupProfessionalInput = z.infer<typeof signupProfessionalSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// PRD 01 §5.1 — Google's own verification already covers email ownership;
// dateOfBirth/biologicalSex still can't come from Google, so a Client's
// Google signup is a two-step flow: verify → complete profile.
export const googleIdTokenSchema = z.object({
  idToken: z.string().min(1),
});
export type GoogleIdTokenInput = z.infer<typeof googleIdTokenSchema>;

export const completeGoogleClientSignupSchema = z.object({
  oauthCompletionToken: z.string().min(1),
  dateOfBirth: z.coerce.date().max(new Date()),
  biologicalSex: biologicalSexSchema,
});
export type CompleteGoogleClientSignupInput = z.infer<
  typeof completeGoogleClientSignupSchema
>;

export const completeGoogleProfessionalSignupSchema = z.object({
  oauthCompletionToken: z.string().min(1),
  specializations: z.array(specializationSchema).min(1).max(2),
  verificationNote: z.string().trim().min(1).max(2000),
});
export type CompleteGoogleProfessionalSignupInput = z.infer<
  typeof completeGoogleProfessionalSignupSchema
>;

export const rejectProfessionalSchema = z.object({
  reason: z.string().trim().max(2000, "Motivo não pode exceder 2000 caracteres").optional(),
});
export type RejectProfessionalInput = z.infer<typeof rejectProfessionalSchema>;
