"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { verifyEmailSchema } from "@peakform/validation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { verifyEmailAction } from "../actions";
import { FormError, SubmitButton, TextField } from "./fields";

// The API emails the raw verification token (PRD 01 §5.2), so this is a
// paste-the-code form; ?token= prefills it when a link is used.
export function VerifyEmailForm({ initialToken }: { initialToken: string }) {
  const [serverError, setServerError] = useState<string>();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ token: string }>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { token: initialToken },
  });

  async function onSubmit(values: { token: string }) {
    setServerError(undefined);
    const result = await verifyEmailAction(values.token.trim());
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
          Email verificado! Você já pode entrar.
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
        label="Código de verificação"
        inputMode="text"
        autoComplete="one-time-code"
        spellCheck={false}
        error={errors.token?.message}
        {...register("token")}
      />
      <SubmitButton pending={isSubmitting} pendingLabel="Verificando…">
        Verificar
      </SubmitButton>
    </form>
  );
}
