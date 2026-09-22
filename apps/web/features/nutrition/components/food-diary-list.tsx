import type { PublicFoodDiaryEntry } from "../api-client";

const MEAL_LABELS: Record<PublicFoodDiaryEntry["mealSlot"], string> = {
  BREAKFAST: "Café da manhã",
  LUNCH: "Almoço",
  DINNER: "Jantar",
  SNACK: "Lanche",
};

export function FoodDiaryList({ entries }: { entries: PublicFoodDiaryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nada registrado hoje ainda.</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-md border border-border p-2 text-sm"
        >
          <div>
            <p className="font-medium text-foreground">
              {entry.customFoodName ?? "Alimento"} — {entry.quantity}g
            </p>
            <p className="text-xs text-muted-foreground">{MEAL_LABELS[entry.mealSlot]}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {entry.nutrientsSnapshot.calories} kcal
          </div>
        </li>
      ))}
    </ul>
  );
}
