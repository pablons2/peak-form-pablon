"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  signupClientSchema,
  type SignupClientInput,
} from "@peakform/validation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signupClientAction } from "../actions";
import { FormError, SubmitButton, TextField, inputClass } from "./fields";

// PRD 01 §5.1 — Client signup collects dateOfBirth + biologicalSex up front
// (required inputs for PRD 04/08's clinical formulas) and immediately sends a
// verification email; there is no approval step for Clients.
export function ClientSignupForm() {
  const [serverError, setServerError] = useState<string>();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupClientInput>({
    resolver: zodResolver(signupClientSchema),
  });

  async function onSubmit(values: SignupClientInput) {
    setServerError(undefined);
    const result = await signupClientAction(values);
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
          Conta criada! Enviamos um email de verificação — confirme seu email
          para poder entrar.
        </p>
        <p className="text-sm text-muted-foreground">
          Já confirmou?{" "}
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
      <TextField
        label="Data de nascimento"
        type="date"
        error={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
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
          aria-invalid={Boolean(errors.biologicalSex)}
          {...register("biologicalSex")}
        >
          <option value="">Selecione…</option>
          <option value="FEMALE">Feminino</option>
          <option value="MALE">Masculino</option>
        </select>
        {errors.biologicalSex ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.biologicalSex.message}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={isSubmitting} pendingLabel="Criando conta…">
        Criar conta
      </SubmitButton>
    </form>
  );
}
