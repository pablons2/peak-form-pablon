"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestProfessionalSchema,
  type RequestProfessionalInput,
} from "@peakform/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError, SubmitButton, TextField, inputClass } from "../../auth/components/fields";
import { requestProfessionalAction } from "../actions";
import { SPECIALIZATION_LABELS } from "../labels";

const SPECIALIZATIONS = Object.entries(SPECIALIZATION_LABELS);

// PRD 02 §5.2 — Client-initiated request: names a Professional's email and
// which specialization is wanted; creates a PENDING link the Professional
// must accept/decline.
export function RequestProfessionalForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RequestProfessionalInput>({
    resolver: zodResolver(requestProfessionalSchema),
  });

  async function onSubmit(values: RequestProfessionalInput) {
    setServerError(undefined);
    setDone(false);
    const result = await requestProfessionalAction(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setDone(true);
    reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormError message={serverError} />
      {done ? (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
          Solicitação enviada!
        </p>
      ) : null}
      <TextField
        label="Email do profissional"
        type="email"
        error={errors.professionalEmail?.message}
        {...register("professionalEmail")}
      />
      <div>
        <label
          htmlFor="specialization"
          className="block text-sm font-medium text-foreground"
        >
          Especialização
        </label>
        <select
          id="specialization"
          className={inputClass}
          defaultValue=""
          aria-invalid={Boolean(errors.specialization)}
          {...register("specialization")}
        >
          <option value="" disabled>
            Selecione…
          </option>
          {SPECIALIZATIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.specialization ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.specialization.message}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={isSubmitting} pendingLabel="Enviando solicitação…">
        Solicitar profissional
      </SubmitButton>
    </form>
  );
}
