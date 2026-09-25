"use client";

// PRD 08 §5.3 — one-tap diary logging straight from a planned meal item:
// pre-fills food + grams + meal slot from the plan row so the Client's
// daily log is one button instead of a search-and-type flow.
import { useState } from "react";
import { Button } from "@peakform/ui";
import { logDiaryEntryAction } from "../actions";
import type { PublicMealPlanItem } from "../api-client";

export function QuickLogButton({
  item,
  mealSlot,
}: {
  item: PublicMealPlanItem;
  mealSlot: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleLog() {
    setSaving(true);
    setError(undefined);
    const result = await logDiaryEntryAction({
      ...(item.foodItemCacheId
        ? { foodItemCacheId: item.foodItemCacheId }
        : {
            customFoodName: item.customFoodName ?? item.name,
            customNutrients: {
              calories: Math.round((item.nutrients.calories / item.quantityGrams) * 100),
              protein: Math.round((item.nutrients.protein / item.quantityGrams) * 1000) / 10,
              carbs: Math.round((item.nutrients.carbs / item.quantityGrams) * 1000) / 10,
              fat: Math.round((item.nutrients.fat / item.quantityGrams) * 1000) / 10,
            },
          }),
      quantity: item.quantityGrams,
      mealSlot,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleLog} disabled={saving}>
        {saving ? "Registrando…" : "Registrar"}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
