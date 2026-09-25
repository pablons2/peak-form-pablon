"use client";

// PRD 08 §5.2 — the Nutritionist's structured meal-plan builder. Slots hold
// items (cached food via TACO search, or manual per-100g entry) with
// editable planned grams; macro totals are computed live here for immediate
// feedback and recomputed server-side on save (savePlanMealsAction
// re-resolves every foodItemCacheId — the numbers below are UX only, never
// the stored truth). Confirm keeps the §5.2 semantics: it is the only path
// that makes the plan ACTIVE and visible to the Client.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityLevelInput } from "@peakform/validation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@peakform/ui";
import { inputClass } from "../../auth/components/fields";
import { confirmPlanAction, generateDraftAction, savePlanMealsAction } from "../actions";
import type { PublicFoodItemCache, PublicMealPlanSlot, PublicNutritionPlan } from "../api-client";
import { FoodSearch, type ManualFoodSelection } from "./food-search";

const MEAL_SLOTS = [
  { value: "BREAKFAST", label: "Café da manhã" },
  { value: "LUNCH", label: "Almoço" },
  { value: "DINNER", label: "Jantar" },
  { value: "SNACK", label: "Lanches" },
] as const;

type SlotValue = (typeof MEAL_SLOTS)[number]["value"];

interface BuilderItem {
  key: string;
  foodItemCacheId: string | null;
  name: string;
  quantityGrams: number;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
}

interface BuilderSlot {
  mealSlot: SlotValue;
  items: BuilderItem[];
}

const ACTIVITY_LEVELS: Array<{ value: ActivityLevelInput; label: string }> = [
  { value: "SEDENTARY", label: "Sedentário" },
  { value: "LIGHT", label: "Leve" },
  { value: "MODERATE", label: "Moderado" },
  { value: "VERY_ACTIVE", label: "Muito ativo" },
  { value: "EXTRA_ACTIVE", label: "Extremamente ativo" },
];

function scale(per100g: BuilderItem["per100g"], grams: number) {
  const f = grams / 100;
  return {
    calories: Math.round(per100g.calories * f),
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  };
}

function sumItems(items: BuilderItem[]) {
  return items.reduce(
    (acc, item) => {
      const n = scale(item.per100g, item.quantityGrams);
      acc.calories += n.calories;
      acc.protein += n.protein;
      acc.carbs += n.carbs;
      acc.fat += n.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// Stored snapshots are per-portion; invert them back to a per-100g basis so
// the live math works while editing grams. The server re-derives the real
// snapshot from the cache on save, so small rounding drift here is cosmetic.
function itemsFromPlan(plan: PublicNutritionPlan | null, mealSlot: SlotValue): BuilderItem[] {
  const stored = (plan?.mealPlan?.slots ?? []).find((s) => s.mealSlot === mealSlot);
  return (stored?.items ?? []).map((item) => ({
    key: crypto.randomUUID(),
    foodItemCacheId: item.foodItemCacheId,
    name: item.name,
    quantityGrams: item.quantityGrams,
    per100g: {
      calories: Math.round((item.nutrients.calories / item.quantityGrams) * 100),
      protein: Math.round((item.nutrients.protein / item.quantityGrams) * 1000) / 10,
      carbs: Math.round((item.nutrients.carbs / item.quantityGrams) * 1000) / 10,
      fat: Math.round((item.nutrients.fat / item.quantityGrams) * 1000) / 10,
    },
  }));
}

function slotItems(slot: PublicMealPlanSlot | undefined) {
  return slot?.items ?? [];
}

function MacroBar({
  label,
  planned,
  target,
  unit = "g",
}: {
  label: string;
  planned: number;
  target: number;
  unit?: string;
}) {
  const percent = target > 0 ? Math.min(100, Math.round((planned / target) * 100)) : 0;
  const tone =
    target <= 0 || planned <= target
      ? "bg-success"
      : planned <= target * 1.1
        ? "bg-warning"
        : "bg-destructive";
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {Math.round(planned * 10) / 10} / {target}
          {unit} ({percent}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: planejado ${planned}${unit} de ${target}${unit}`}
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MealPlanBuilder({
  clientId,
  plan,
}: {
  clientId: string;
  plan: PublicNutritionPlan | null;
}) {
  const router = useRouter();
  const isDraft = plan?.status === "DRAFT";

  const [slots, setSlots] = useState<BuilderSlot[]>(() =>
    MEAL_SLOTS.map((s) => ({ mealSlot: s.value, items: itemsFromPlan(plan, s.value) })),
  );
  const [targets, setTargets] = useState({
    calorieTarget: String(plan?.calorieTarget ?? ""),
    protein: String(plan?.macroTargets.protein ?? ""),
    carbs: String(plan?.macroTargets.carbs ?? ""),
    fat: String(plan?.macroTargets.fat ?? ""),
  });
  const [activityLevel, setActivityLevel] = useState<ActivityLevelInput>("MODERATE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const dayTotals = useMemo(() => sumItems(slots.flatMap((s) => s.items)), [slots]);

  function addItem(slot: SlotValue, selection: PublicFoodItemCache | ManualFoodSelection) {
    setSlots((prev) =>
      prev.map((s) =>
        s.mealSlot === slot
          ? {
              ...s,
              items: [
                ...s.items,
                {
                  key: crypto.randomUUID(),
                  foodItemCacheId: "id" in selection ? selection.id : null,
                  name: "id" in selection ? selection.name : selection.customFoodName,
                  per100g:
                    "nutrients" in selection
                      ? selection.nutrients
                      : (selection as ManualFoodSelection).customNutrients,
                  quantityGrams: 100,
                },
              ],
            }
          : s,
      ),
    );
  }

  function updateGrams(slot: SlotValue, key: string, grams: number) {
    setSlots((prev) =>
      prev.map((s) =>
        s.mealSlot === slot
          ? {
              ...s,
              items: s.items.map((i) =>
                i.key === key ? { ...i, quantityGrams: Math.max(1, grams || 0) } : i,
              ),
            }
          : s,
      ),
    );
  }

  function removeItem(slot: SlotValue, key: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.mealSlot === slot ? { ...s, items: s.items.filter((i) => i.key !== key) } : s,
      ),
    );
  }

  async function handleGenerateDraft() {
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

  async function handleSaveMeals() {
    if (!plan) return;
    setSaving(true);
    setError(undefined);
    const result = await savePlanMealsAction(plan.id, clientId, {
      slots: slots.map((s) => ({
        mealSlot: s.mealSlot,
        items: s.items.map((i) =>
          i.foodItemCacheId
            ? { foodItemCacheId: i.foodItemCacheId, quantityGrams: i.quantityGrams }
            : {
                customFoodName: i.name,
                customNutrients: i.per100g,
                quantityGrams: i.quantityGrams,
              },
        ),
      })),
    });
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
      calorieTarget: Number(targets.calorieTarget),
      macroTargets: {
        protein: Number(targets.protein),
        carbs: Number(targets.carbs),
        fat: Number(targets.fat),
      },
      mealPlan: plan.mealPlan,
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
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Metas do plano</CardTitle>
            {plan ? (
              <Badge variant={plan.status === "DRAFT" ? "warning" : "success"}>
                {plan.status === "DRAFT" ? "Rascunho (invisível ao cliente)" : "Ativo"}
              </Badge>
            ) : null}
          </div>

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
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateDraft}
                disabled={saving}
              >
                {plan ? "Gerar novo rascunho" : "Gerar estimativa inicial"}
              </Button>
            </div>
          ) : null}

          {plan ? (
            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-sm font-medium text-foreground">
                  Meta calórica (kcal)
                  <input
                    type="number"
                    required
                    min="1"
                    className={inputClass}
                    value={targets.calorieTarget}
                    onChange={(e) => setTargets({ ...targets, calorieTarget: e.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Proteína (g)
                  <input
                    type="number"
                    required
                    min="0"
                    className={inputClass}
                    value={targets.protein}
                    onChange={(e) => setTargets({ ...targets, protein: e.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Carboidrato (g)
                  <input
                    type="number"
                    required
                    min="0"
                    className={inputClass}
                    value={targets.carbs}
                    onChange={(e) => setTargets({ ...targets, carbs: e.target.value })}
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Gordura (g)
                  <input
                    type="number"
                    required
                    min="0"
                    className={inputClass}
                    value={targets.fat}
                    onChange={(e) => setTargets({ ...targets, fat: e.target.value })}
                  />
                </label>
              </div>
              <Button type="submit" disabled={saving}>
                {plan.status === "DRAFT" ? "Confirmar plano (visível ao cliente)" : "Salvar metas"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Gere a estimativa inicial (Mifflin-St Jeor) para começar a montar a dieta.
            </p>
          )}
        </CardContent>
      </Card>

      {plan ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Refeições planejadas</CardTitle>
              <Button type="button" size="sm" onClick={handleSaveMeals} disabled={saving}>
                {saving ? "Salvando…" : "Salvar refeições"}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MacroBar
                label="Calorias planejadas"
                planned={dayTotals.calories}
                target={Number(targets.calorieTarget) || 0}
                unit="kcal"
              />
              <MacroBar
                label="Proteína planejada"
                planned={dayTotals.protein}
                target={Number(targets.protein) || 0}
              />
              <MacroBar
                label="Carboidrato planejado"
                planned={dayTotals.carbs}
                target={Number(targets.carbs) || 0}
              />
              <MacroBar
                label="Gordura planejada"
                planned={dayTotals.fat}
                target={Number(targets.fat) || 0}
              />
            </div>

            <Tabs defaultValue="BREAKFAST">
              <TabsList>
                {MEAL_SLOTS.map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {slots.map((slot) => {
                const slotTotals = sumItems(slot.items);
                return (
                  <TabsContent key={slot.mealSlot} value={slot.mealSlot} className="space-y-3 pt-3">
                    <ul className="space-y-2">
                      {slot.items.length === 0 ? (
                        <li className="text-sm text-muted-foreground">
                          Nenhum alimento nesta refeição ainda.
                        </li>
                      ) : (
                        slot.items.map((item) => {
                          const n = scale(item.per100g, item.quantityGrams);
                          return (
                            <li
                              key={item.key}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {n.calories} kcal · P {n.protein}g · C {n.carbs}g · G {n.fat}g
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground">
                                  Gramas
                                  <input
                                    type="number"
                                    min="1"
                                    max="5000"
                                    aria-label={`Gramas de ${item.name}`}
                                    className={`${inputClass} ml-1 w-20`}
                                    value={item.quantityGrams}
                                    onChange={(e) =>
                                      updateGrams(slot.mealSlot, item.key, Number(e.target.value))
                                    }
                                  />
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remover ${item.name}`}
                                  onClick={() => removeItem(slot.mealSlot, item.key)}
                                >
                                  ×
                                </Button>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>

                    <p className="text-xs text-muted-foreground">
                      Subtotal da refeição: {Math.round(slotTotals.calories)} kcal · P{" "}
                      {Math.round(slotTotals.protein * 10) / 10}g · C{" "}
                      {Math.round(slotTotals.carbs * 10) / 10}g · G{" "}
                      {Math.round(slotTotals.fat * 10) / 10}g
                    </p>

                    <FoodSearch onAdd={(selection) => addItem(slot.mealSlot, selection)} />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
