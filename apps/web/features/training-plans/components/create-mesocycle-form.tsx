"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MesocycleGoalInput } from "@peakform/validation";
import { FormError, SubmitButton, inputClass } from "../../auth/components/fields";
import { createMesocycleAction } from "../actions";
import { MESOCYCLE_GOAL_LABELS } from "../labels";

const GOALS: MesocycleGoalInput[] = [
  "HYPERTROPHY",
  "STRENGTH",
  "ENDURANCE",
  "POWER",
  "GENERAL_FITNESS",
  "OTHER",
];

// PRD 06 §5.2 — adds a mesocycle (training block) to a plan.
export function CreateMesocycleForm({ planId }: { planId: string }) {
  const router = useRouter();
  const [weeks, setWeeks] = useState(6);
  const [goal, setGoal] = useState<MesocycleGoalInput>("HYPERTROPHY");
  const [isDeload, setIsDeload] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await createMesocycleAction(planId, { weeks, goal, isDeload });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/plans/${planId}/mesocycles/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <div>
        <label htmlFor="weeks" className="block text-sm font-medium text-foreground">
          Duração (semanas)
        </label>
        <input
          id="weeks"
          type="number"
          min={1}
          max={52}
          required
          className={inputClass}
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
        />
      </div>
      <div>
        <label htmlFor="goal" className="block text-sm font-medium text-foreground">
          Objetivo
        </label>
        <select
          id="goal"
          className={inputClass}
          value={goal}
          onChange={(e) => setGoal(e.target.value as MesocycleGoalInput)}
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {MESOCYCLE_GOAL_LABELS[g]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          checked={isDeload}
          onChange={(e) => setIsDeload(e.target.checked)}
        />
        Semana/bloco de deload
      </label>
      <SubmitButton pending={pending} pendingLabel="Adicionando…">
        Adicionar mesociclo
      </SubmitButton>
    </form>
  );
}
