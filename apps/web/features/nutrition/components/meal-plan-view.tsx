// PRD 08 §5.2/§7 — read-only rendering of a plan's structured mealPlan.
// Shared by the Client's "Minha dieta" section and the Nutritionist's
// acompanhamento panel. Renders both the structured items format and the
// legacy free-text `suggestedFoods` format (older plan rows). With
// `showQuickLog`, each item gains a one-tap "Registrar" button (Client
// diary logging straight from the plan).
import { Badge, Card, CardContent, CardTitle } from "@peakform/ui";
import type { PublicMealPlanSlot, PublicNutritionPlan } from "../api-client";
import { QuickLogButton } from "./quick-log-button";

const MEAL_LABELS: Record<PublicMealPlanSlot["mealSlot"], string> = {
  BREAKFAST: "Café da manhã",
  LUNCH: "Almoço",
  DINNER: "Jantar",
  SNACK: "Lanches",
};

export function MealPlanView({
  plan,
  showQuickLog = false,
}: {
  plan: PublicNutritionPlan;
  showQuickLog?: boolean;
}) {
  const slots = plan.mealPlan?.slots ?? [];

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este plano ainda não tem refeições montadas — apenas as metas de calorias e macros.
      </p>
    );
  }

  const dayTotals = plan.mealPlan?.dayTotals;

  return (
    <div className="space-y-3">
      {slots.map((slot) => (
        <div key={slot.mealSlot} className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{MEAL_LABELS[slot.mealSlot]}</p>
            {slot.totals ? (
              <p className="text-xs text-muted-foreground">
                {Math.round(slot.totals.calories)} kcal
              </p>
            ) : null}
          </div>

          {slot.items && slot.items.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {slot.items.map((item, index) => (
                <li
                  key={`${item.foodItemCacheId ?? item.customFoodName}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {item.name} — {item.quantityGrams}g
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.nutrients.calories} kcal · P {item.nutrients.protein}g · C{" "}
                      {item.nutrients.carbs}g · G {item.nutrients.fat}g
                    </p>
                  </div>
                  {showQuickLog ? (
                    <QuickLogButton item={item} mealSlot={slot.mealSlot} />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : slot.suggestedFoods && slot.suggestedFoods.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {slot.suggestedFoods.map((food) => (
                <li key={food}>{food}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Sem alimentos planejados.</p>
          )}
        </div>
      ))}

      {dayTotals ? (
        <Card>
          <CardContent className="p-3">
            <CardTitle>Totais planejados do dia</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {Math.round(dayTotals.calories)} kcal · P {dayTotals.protein}g · C {dayTotals.carbs}g
              · G {dayTotals.fat}g — meta: {plan.calorieTarget} kcal
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
