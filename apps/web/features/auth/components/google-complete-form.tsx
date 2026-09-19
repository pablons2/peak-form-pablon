"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  completeGoogleClientSignupSchema,
  completeGoogleProfessionalSignupSchema,
  type CompleteGoogleClientSignupInput,
  type CompleteGoogleProfessionalSignupInput,
} from "@peakform/validation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  completeGoogleClientSignupAction,
  completeGoogleProfessionalSignupAction,
} from "../actions";
import { FormError, SubmitButton, TextField, inputClass } from "./fields";

type Role = "client" | "professional";

const SPECIALIZATIONS = [
  { value: "PERSONAL_TRAINER", label: "Personal trainer" },
  { value: "NUTRITIONIST", label: "Nutricionista" },
] as const;

// PRD 01 §5.1 — Google verified the email but supplies nothing else, so the
// user picks their role here and fills the role-specific remainder. After the
// API account exists we bounce through signIn("google") once more, which now
// hits the "authenticated" path and establishes the NextAuth session.
export function GoogleCompleteForm({
  completionToken,
  email,
}: {
  completionToken: string;
  email: string;
}) {
  const [role, setRole] = useState<Role>("client");
  const [serverError, setServerError] = useState<string>();
  const [pending, setPending] = useState(false);

  const clientForm = useForm<CompleteGoogleClientSignupInput>({
    resolver: zodResolver(completeGoogleClientSignupSchema),
    defaultValues: { oauthCompletionToken: completionToken },
  });
  const professionalForm = useForm<CompleteGoogleProfessionalSignupInput>({
    resolver: zodResolver(completeGoogleProfessionalSignupSchema),
    defaultValues: {
      oauthCompletionToken: completionToken,
      specializations: [],
    },
  });

  async function finish(action: () => Promise<{ ok: boolean; message?: string }>) {
    setServerError(undefined);
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    // Account now exists — a fresh Google sign-in authenticates immediately.
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  const clientErrors = clientForm.formState.errors;
  const professionalErrors = professionalForm.formState.errors;

  return (
    <div className="mt-4 space-y-4">
      <FormError message={serverError} />

      <fieldset>
        <legend className="text-sm font-medium text-foreground">
          Como você vai usar o PeakForm?
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { value: "client", label: "Sou aluno(a)" },
              { value: "professional", label: "Sou profissional" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              aria-pressed={role === option.value}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-ring ${
                role === option.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-input bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {role === "client" ? (
        <form
          onSubmit={clientForm.handleSubmit((values) =>
            finish(() => completeGoogleClientSignupAction(values)),
          )}
          className="space-y-4"
          noValidate
        >
          <TextField
            label="Data de nascimento"
            type="date"
            error={clientErrors.dateOfBirth?.message}
            {...clientForm.register("dateOfBirth")}
          />
          <div>
            <label
              htmlFor="biologicalSex"
              className="block text-sm font-medium text-foreground"
            >
              Sexo biológico
            </label>
            <select
              id="biologicalSex"
              className={inputClass}
              aria-invalid={Boolean(clientErrors.biologicalSex)}
              {...clientForm.register("biologicalSex")}
            >
              <option value="">Selecione…</option>
              <option value="FEMALE">Feminino</option>
              <option value="MALE">Masculino</option>
            </select>
            {clientErrors.biologicalSex ? (
              <p className="mt-1 text-sm text-destructive">
                {clientErrors.biologicalSex.message}
              </p>
            ) : null}
          </div>
          <SubmitButton pending={pending} pendingLabel="Concluindo…">
            Concluir cadastro
          </SubmitButton>
        </form>
      ) : (
        <form
          onSubmit={professionalForm.handleSubmit((values) =>
            finish(() => completeGoogleProfessionalSignupAction(values)),
          )}
          className="space-y-4"
          noValidate
        >
          <fieldset>
            <legend className="text-sm font-medium text-foreground">
              Especialização
            </legend>
            <div className="mt-2 space-y-2">
              {SPECIALIZATIONS.map((spec) => (
                <label
                  key={spec.value}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    value={spec.value}
                    className="h-4 w-4 rounded border-input accent-primary"
                    {...professionalForm.register("specializations")}
                  />
                  {spec.label}
                </label>
              ))}
            </div>
            {professionalErrors.specializations ? (
              <p className="mt-1 text-sm text-destructive">
                {professionalErrors.specializations.message}
              </p>
            ) : null}
          </fieldset>
          <div>
            <label
              htmlFor="verificationNote"
              className="block text-sm font-medium text-foreground"
            >
              Como o administrador pode verificar você?
            </label>
            <textarea
              id="verificationNote"
              rows={3}
              placeholder="Ex.: número do CREF, indicação de outro profissional…"
              className={inputClass}
              aria-invalid={Boolean(professionalErrors.verificationNote)}
              {...professionalForm.register("verificationNote")}
            />
            {professionalErrors.verificationNote ? (
              <p className="mt-1 text-sm text-destructive">
                {professionalErrors.verificationNote.message}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Sua conta será analisada por um administrador antes que você possa
            criar planos para alunos.
          </p>
          <SubmitButton pending={pending} pendingLabel="Concluindo…">
            Concluir cadastro
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
