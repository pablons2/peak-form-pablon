"use client";

// PRD 08 §5.1/§5.2/§7 — the Nutritionist-only draft review + confirm/edit
// screen. This component only ever renders on a Professional/Admin-facing
// page (see the route it's used from) — the Client-facing food-diary page
// never imports it and never fetches from the endpoint that could return a
// DRAFT, so there is no shared-component leak surface (§7's explicit
// warning).
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityLevelInput } from "@peakform/validation";
import { inputClass } from "../../auth/components/fields";
import { confirmPlanAction, generateDraftAction } from "../actions";
import type { PublicNutritionPlan } from "../api-client";

const ACTIVITY_LEVELS: Array<{ value: ActivityLevelInput; label: string }> = [
  { value: "SEDENTARY", label: "Sedentário" },
  { value: "LIGHT", label: "Leve" },
  { value: "MODERATE", label: "Moderado" },
  { value: "VERY_ACTIVE", label: "Muito ativo" },
  { value: "EXTRA_ACTIVE", label: "Extremamente ativo" },
];

export function DraftReviewForm({
  clientId,
  plan,
}: {
  clientId: string;
  plan: PublicNutritionPlan | null;
}) {
  const router = useRouter();
  const [activityLevel, setActivityLevel] = useState<ActivityLevelInput>("MODERATE");
  const [calorieTarget, setCalorieTarget] = useState(String(plan?.calorieTarget ?? ""));
  const [protein, setProtein] = useState(String(plan?.macroTargets.protein ?? ""));
  const [carbs, setCarbs] = useState(String(plan?.macroTargets.carbs ?? ""));
  const [fat, setFat] = useState(String(plan?.macroTargets.fat ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleGenerate() {
    setSaving(true);
    setError(undefined);
    const result = await generateDraftAction(clientId, activityLevel);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setSaving(true);
    setError(undefined);
    const result = await confirmPlanAction(plan.id, clientId, {
      calorieTarget: Number(calorieTarget),
      macroTargets: {
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
      },
      mealPlan: null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!plan || plan.status !== "DRAFT" ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-foreground">
            Nível de atividade
            <select
              className={inputClass}
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevelInput)}
            >
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Gerando…" : "Gerar novo rascunho"}
          </button>
        </div>
      ) : null}

      {plan ? (
        <form onSubmit={handleConfirm} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm text-muted-foreground">
            Status atual:{" "}
            <span className="font-medium text-foreground">
              {plan.status === "DRAFT" ? "Rascunho (não visível ao cliente)" : "Ativo"}
            </span>
          </p>
          <label className="block text-sm font-medium text-foreground">
            Meta calórica (kcal)
            <input
              type="number"
              required
              className={inputClass}
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-sm font-medium text-foreground">
              Proteína (g)
              <input
                type="number"
                required
                className={inputClass}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Carboidrato (g)
              <input
                type="number"
                required
                className={inputClass}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Gordura (g)
              <input
                type="number"
                required
                className={inputClass}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving
              ? "Salvando…"
              : plan.status === "DRAFT"
                ? "Confirmar meta"
                : "Salvar alterações"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma meta gerada ainda para este cliente.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
