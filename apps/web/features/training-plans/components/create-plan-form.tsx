"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormError, SubmitButton, TextField, inputClass } from "../../auth/components/fields";
import { createStarterTemplateAction, createTrainingPlanAction } from "../actions";

// PRD 06 §5.1/§5.8 — creates a concrete plan for a Client, or (when
// `clientId` is omitted) a Starter Template. Same name+startDate fields
// either way; only the destination action differs.
export function CreatePlanForm({ clientId }: { clientId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = clientId
      ? await createTrainingPlanAction({ clientId, name, startDate: new Date(startDate) })
      : await createStarterTemplateAction({ name, startDate: new Date(startDate) });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/plans/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <TextField
        label="Nome do plano"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-foreground">
          Data de início
        </label>
        <input
          id="startDate"
          type="date"
          required
          className={inputClass}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <SubmitButton pending={pending} pendingLabel="Criando…">
        Criar plano
      </SubmitButton>
    </form>
  );
}
