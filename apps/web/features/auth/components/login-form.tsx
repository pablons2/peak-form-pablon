"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@peakform/validation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError, SubmitButton, TextField } from "./fields";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email ou senha inválidos.",
  GoogleTokenMissing: "Não foi possível autenticar com o Google.",
  GoogleSigninFailed: "Não foi possível autenticar com o Google.",
};

export function LoginForm({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError?: string;
}) {
  const [serverError, setServerError] = useState<string | undefined>(
    initialError ? (ERROR_MESSAGES[initialError] ?? initialError) : undefined,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(undefined);
    // NextAuth's own redirect (not redirect:false + router.push): the 302 from
    // the credentials callback commits the session cookie before the browser
    // requests /dashboard — pushing client-side races the cookie write and can
    // bounce a just-signed-in user back through middleware to /login.
    // Failures land back here as ?error=.
    await signIn("credentials", {
      ...values,
      callbackUrl: "/dashboard",
    });
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
