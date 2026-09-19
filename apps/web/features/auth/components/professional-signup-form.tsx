"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  signupProfessionalSchema,
  type SignupProfessionalInput,
} from "@peakform/validation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signupProfessionalAction } from "../actions";
import { FormError, SubmitButton, TextField, inputClass } from "./fields";

const SPECIALIZATIONS = [
  { value: "PERSONAL_TRAINER", label: "Personal trainer" },
  { value: "NUTRITIONIST", label: "Nutricionista" },
] as const;

// PRD 01 §5.1 — Professional signup additionally collects requested
// specialization(s) and a free-text verification note (CREF number, referral,
// …) that goes to the admin approval queue; email verification still applies.
export function ProfessionalSignupForm() {
  const [serverError, setServerError] = useState<string>();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupProfessionalInput>({
    resolver: zodResolver(signupProfessionalSchema),
    defaultValues: { specializations: [] },
  });

  async function onSubmit(values: SignupProfessionalInput) {
    setServerError(undefined);
    const result = await signupProfessionalAction(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-4 space-y-3" role="status">
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Cadastro enviado! Confirme seu email e aguarde a análise do
          administrador — você poderá entrar, mas os recursos profissionais só
          liberam após a aprovação.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link href="/verify-email" className="text-accent hover:underline">
            Verificar email
          </Link>{" "}
          ou{" "}
          <Link href="/login" className="text-accent hover:underline">
            entrar
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 space-y-4"
      noValidate
    >
      <FormError message={serverError} />
      <TextField
        label="Nome completo"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

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
                {...register("specializations")}
              />
              {spec.label}
            </label>
          ))}
        </div>
        {errors.specializations ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.specializations.message}
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
          aria-invalid={Boolean(errors.verificationNote)}
          {...register("verificationNote")}
        />
        {errors.verificationNote ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.verificationNote.message}
          </p>
        ) : null}
      </div>

      <SubmitButton pending={isSubmitting} pendingLabel="Enviando cadastro…">
        Enviar cadastro
      </SubmitButton>
    </form>
  );
}
