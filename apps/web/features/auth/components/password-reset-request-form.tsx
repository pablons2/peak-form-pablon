"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@peakform/validation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { requestPasswordResetAction } from "../actions";
import { SubmitButton, TextField } from "./fields";

// PRD 01 §5.4 — the request endpoint always answers the same way whether or
// not the account exists, so this form always lands on the same confirmation
// state (no account-existence leak).
export function PasswordResetRequestForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
  });

  async function onSubmit(values: RequestPasswordResetInput) {
    await requestPasswordResetAction(values);
  }

  if (isSubmitSuccessful) {
    return (
      <div className="mt-4 space-y-3" role="status">
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Se este email estiver cadastrado, você receberá um código para
          redefinir a senha.
        </p>
        <p className="text-sm text-muted-foreground">
          Já tem o código?{" "}
          <Link
            href="/password-reset/confirm"
            className="text-accent hover:underline"
          >
            Redefinir senha
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
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <SubmitButton pending={isSubmitting} pendingLabel="Enviando…">
        Enviar código
      </SubmitButton>
    </form>
  );
}
