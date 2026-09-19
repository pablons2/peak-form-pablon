"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  inviteClientSchema,
  type InviteClientInput,
} from "@peakform/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError, SubmitButton, TextField } from "../../auth/components/fields";
import { inviteClientAction } from "../actions";
import { SPECIALIZATION_LABELS } from "../labels";

// PRD 02 §5.1 — Professional invites a Client by email, for one or both of
// the Professional's own specializations (the API re-checks ownership; this
// only offers what the caller actually holds so the happy path never hits
// that rejection).
export function InviteClientForm({
  ownSpecializations,
}: {
  ownSpecializations: string[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteClientInput>({
    resolver: zodResolver(inviteClientSchema),
    defaultValues: { clientEmail: "", specializations: [] },
  });

  async function onSubmit(values: InviteClientInput) {
    setServerError(undefined);
    setDone(false);
    const result = await inviteClientAction(values);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setDone(true);
    reset({ clientEmail: "", specializations: [] });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormError message={serverError} />
      {done ? (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
          Convite enviado!
        </p>
      ) : null}
      <TextField
        label="Email do cliente"
        type="email"
        error={errors.clientEmail?.message}
        {...register("clientEmail")}
      />
      <fieldset>
        <legend className="text-sm font-medium text-foreground">
          Especialização do convite
        </legend>
        <div className="mt-2 space-y-2">
          {ownSpecializations.map((spec) => (
            <label
              key={spec}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input
                type="checkbox"
                value={spec}
                className="h-4 w-4 rounded border-input accent-primary"
                {...register("specializations")}
              />
              {SPECIALIZATION_LABELS[spec] ?? spec}
            </label>
          ))}
        </div>
        {errors.specializations ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.specializations.message}
          </p>
        ) : null}
      </fieldset>
      <SubmitButton pending={isSubmitting} pendingLabel="Enviando convite…">
        Convidar cliente
      </SubmitButton>
    </form>
  );
}
