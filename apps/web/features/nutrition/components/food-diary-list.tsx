import type { PublicFoodDiaryEntry } from "../api-client";

const MEAL_LABELS: Record<PublicFoodDiaryEntry["mealSlot"], string> = {
  BREAKFAST: "Café da manhã",
  LUNCH: "Almoço",
  DINNER: "Jantar",
  SNACK: "Lanche",
};

const MEAL_ORDER: Array<PublicFoodDiaryEntry["mealSlot"]> = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
];

// Grouped by meal slot (§5.3) so the Client scans their day the way they
// ate it — one section per refeição with a per-slot kcal subtotal, instead
// of the old flat list.
export function FoodDiaryList({ entries }: { entries: PublicFoodDiaryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada registrado hoje ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {MEAL_ORDER.map((slot) => {
        const slotEntries = entries.filter((e) => e.mealSlot === slot);
        if (slotEntries.length === 0) return null;
        const slotKcal = slotEntries.reduce((sum, e) => sum + e.nutrientsSnapshot.calories, 0);
        return (
          <section key={slot}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {MEAL_LABELS[slot]}
              </h3>
              <span className="text-xs text-muted-foreground">
                {Math.round(slotKcal)} kcal
              </span>
            </div>
            <ul className="mt-1 space-y-1">
              {slotEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {entry.customFoodName ?? "Alimento"} — {entry.quantity}g
                  </p>
                  <div className="text-right text-xs text-muted-foreground">
                    {entry.nutrientsSnapshot.calories} kcal · P{" "}
                    {entry.nutrientsSnapshot.protein}g · C {entry.nutrientsSnapshot.carbs}g · G{" "}
                    {entry.nutrientsSnapshot.fat}g
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
