"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@peakform/validation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "../actions";
import { FormError, SubmitButton, TextField } from "./fields";

// PRD 01 §5.4 — a successful reset also invalidates every existing session
// (the API bumps tokenVersion), so the confirmation points straight at login.
export function PasswordResetConfirmForm({
  initialToken,
}: {
  initialToken: string;
}) {
  const [serverError, setServerError] = useState<string>();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: initialToken },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(undefined);
    const result = await resetPasswordAction({
      ...values,
      token: values.token.trim(),
    });
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-4" role="status">
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Senha redefinida! Entre com a nova senha — suas sessões antigas foram
          encerradas.
        </p>
        <p className="mt-3 text-center">
          <Link
            href="/login"
            className="inline-block rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-fast hover:opacity-90"
          >
            Ir para o login
          </Link>
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
        label="Código recebido por email"
        autoComplete="one-time-code"
        spellCheck={false}
        error={errors.token?.message}
        {...register("token")}
      />
      <TextField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />
      <SubmitButton pending={isSubmitting} pendingLabel="Redefinindo…">
        Redefinir senha
      </SubmitButton>
    </form>
  );
}
