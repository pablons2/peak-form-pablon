"use client";

// PRD 08 §5.3 — the food lookup used by both the Client diary logger and the
// Nutritionist's meal-plan builder: TACO (pt-BR) first via the shared
// /nutrition/food/search endpoint, with a manual per-100g entry fallback for
// foods no source knows. Debounced text search; the caller receives the
// resolved item (or manual entry) via onAdd.
import { useEffect, useState } from "react";
import { Button } from "@peakform/ui";
import { inputClass } from "../../auth/components/fields";
import { searchFoodAction } from "../actions";
import type { PublicFoodItemCache } from "../api-client";

export interface ManualFoodSelection {
  customFoodName: string;
  customNutrients: { calories: number; protein: number; carbs: number; fat: number };
}

export function FoodSearch({
  onAdd,
}: {
  onAdd: (item: PublicFoodItemCache | ManualFoodSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicFoodItemCache[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Debounced auto-search — 300ms keeps the server-action round-trips sane
  // while typing without needing an explicit search button.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchFoodAction(q);
      setResults(result.items);
      setSearching(false);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) return;
    onAdd({
      customFoodName: manualName.trim(),
      customNutrients: {
        calories: Number(manualCalories) || 0,
        protein: Number(manualProtein) || 0,
        carbs: Number(manualCarbs) || 0,
        fat: Number(manualFat) || 0,
      },
    });
    setManualName("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setQuery("");
    setResults([]);
    setSearched(false);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Buscar alimento (TACO)
        <input
          type="text"
          placeholder="ex.: peito de frango grelhado"
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {results.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(item);
                  setQuery("");
                  setResults([]);
                  setSearched(false);
                }}
                className="w-full rounded-md border border-border p-2 text-left text-sm hover:bg-accent/10"
              >
                <span className="font-medium text-foreground">{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.nutrients.calories} kcal · P {item.nutrients.protein}g · C{" "}
                  {item.nutrients.carbs}g · G {item.nutrients.fat}g / 100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : searched && !searching && query.trim().length >= 2 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum alimento encontrado — cadastre manualmente abaixo.
        </p>
      ) : null}

      <details className="rounded-md border border-border p-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Alimento manual (por 100g)
        </summary>
        <form onSubmit={submitManual} className="mt-2 space-y-2">
          <input
            type="text"
            aria-label="Nome do alimento"
            placeholder="Nome do alimento"
            required
            className={inputClass}
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />
          <div className="grid grid-cols-4 gap-2">
            <input
              type="number"
              aria-label="Calorias por 100g (kcal)"
              placeholder="kcal"
              min="0"
              className={inputClass}
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
            />
            <input
              type="number"
              aria-label="Proteína por 100g (g)"
              placeholder="prot g"
              min="0"
              className={inputClass}
              value={manualProtein}
              onChange={(e) => setManualProtein(e.target.value)}
            />
            <input
              type="number"
              aria-label="Carboidrato por 100g (g)"
              placeholder="carb g"
              min="0"
              className={inputClass}
              value={manualCarbs}
              onChange={(e) => setManualCarbs(e.target.value)}
            />
            <input
              type="number"
              aria-label="Gordura por 100g (g)"
              placeholder="gord g"
              min="0"
              className={inputClass}
              value={manualFat}
              onChange={(e) => setManualFat(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Adicionar alimento manual
          </Button>
        </form>
      </details>
    </div>
  );
}
