"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@peakform/validation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { mapNextAuthError } from "../next-auth-error-messages";
import { FormError, SubmitButton, TextField } from "./fields";

export function LoginForm({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError?: string;
}) {
  const [serverError, setServerError] = useState<string | undefined>(
    initialError ? mapNextAuthError(initialError) : undefined,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(undefined);
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
    });

    if (result?.error) {
      setServerError(mapNextAuthError(result.error));
      return;
    }

    if (result?.ok) {
      // Hard navigation ensures the session cookie is present when the page loads
      window.location.assign("/dashboard");
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <FormError message={serverError} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <SubmitButton pending={isSubmitting} pendingLabel="Entrando…">
          Entrar
        </SubmitButton>
      </form>
      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Entrar com Google
          </button>
        </>
      ) : null}
    </div>
  );
}
