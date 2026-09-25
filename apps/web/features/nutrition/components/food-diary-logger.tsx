"use client";

// PRD 08 §5.3/§7 — food lookup by text search (TACO) or typed barcode
// (Open Food Facts), with a manual-entry fallback for the "not found"
// case (§7's explicit requirement: handle it gracefully, not as a dead
// end). Camera-based barcode scanning was removed: the capture-only file
// input never processed the image, so the button was decorative.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "../../auth/components/fields";
import { lookupBarcodeAction, logDiaryEntryAction, searchFoodAction } from "../actions";
import type { PublicFoodItemCache } from "../api-client";

const MEAL_SLOTS = [
  { value: "BREAKFAST", label: "Café da manhã" },
  { value: "LUNCH", label: "Almoço" },
  { value: "DINNER", label: "Jantar" },
  { value: "SNACK", label: "Lanche" },
] as const;

export function FoodDiaryLogger() {
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicFoodItemCache[]>([]);
  const [resolvedItem, setResolvedItem] = useState<PublicFoodItemCache | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState("100");
  const [mealSlot, setMealSlot] = useState<(typeof MEAL_SLOTS)[number]["value"]>("BREAKFAST");
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleBarcodeSearch() {
    if (!barcode.trim()) return;
    setNotFound(false);
    setResolvedItem(null);
    const result = await lookupBarcodeAction(barcode.trim());
    if (result.item) {
      setResolvedItem(result.item);
    } else {
      setNotFound(true);
    }
  }

  async function handleTextSearch() {
    if (!query.trim()) return;
    const result = await searchFoodAction(query.trim());
    setSearchResults(result.items);
  }

  async function submitCachedEntry() {
    if (!resolvedItem) return;
    setSaving(true);
    setError(undefined);
    const result = await logDiaryEntryAction({
      foodItemCacheId: resolvedItem.id,
      quantity: Number(quantity),
      mealSlot,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setResolvedItem(null);
    setBarcode("");
    setSearchResults([]);
    router.refresh();
  }

  async function submitManualEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!manualName.trim()) {
      setError("Informe o nome do alimento.");
      return;
    }
    setSaving(true);
    setError(undefined);
    const result = await logDiaryEntryAction({
      customFoodName: manualName.trim(),
      customNutrients: {
        calories: Number(manualCalories) || 0,
        protein: Number(manualProtein) || 0,
        carbs: Number(manualCarbs) || 0,
        fat: Number(manualFat) || 0,
      },
      quantity: Number(quantity),
      mealSlot,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNotFound(false);
    setManualName("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setBarcode("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium text-foreground">
          Quantidade (g)
          <input
            type="number"
            min="1"
            className={inputClass}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-foreground">
          Refeição
          <select
            className={inputClass}
            value={mealSlot}
            onChange={(e) => setMealSlot(e.target.value as typeof mealSlot)}
          >
            {MEAL_SLOTS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-foreground">Código de barras</p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Código de barras"
            placeholder="Digite o código de barras"
            className={inputClass}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
          <button
            type="button"
            onClick={handleBarcodeSearch}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Buscar código
          </button>
        </div>
        {resolvedItem ? (
          <div className="rounded-md bg-accent/10 p-2 text-sm">
            <p className="font-medium text-foreground">{resolvedItem.name}</p>
            <p className="text-muted-foreground">
              {resolvedItem.nutrients.calories} kcal / 100g
            </p>
            <button
              type="button"
              onClick={submitCachedEntry}
              disabled={saving}
              className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Registrar este alimento"}
            </button>
          </div>
        ) : null}
        {notFound ? (
          <p role="alert" className="text-sm text-muted-foreground">
            Produto não encontrado. Preencha manualmente abaixo.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-foreground">Buscar alimento</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ex.: peito de frango"
            className={inputClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            onClick={handleTextSearch}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Buscar alimento
          </button>
        </div>
        {searchResults.length > 0 ? (
          <ul className="space-y-1">
            {searchResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setResolvedItem(item);
                    setNotFound(false);
                  }}
                  className="w-full rounded-md border border-border p-2 text-left text-sm hover:bg-accent/10"
                >
                  {item.name} — {item.nutrients.calories} kcal/100g
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {notFound ? (
        <form
          onSubmit={submitManualEntry}
          className="space-y-2 rounded-lg border border-border p-3"
        >
          <p className="text-sm font-medium text-foreground">Entrada manual (100g)</p>
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
              aria-label="Calorias (kcal)"
              placeholder="kcal"
              className={inputClass}
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
            />
            <input
              type="number"
              placeholder="prot (g)"
              className={inputClass}
              value={manualProtein}
              onChange={(e) => setManualProtein(e.target.value)}
            />
            <input
              type="number"
              placeholder="carb (g)"
              className={inputClass}
              value={manualCarbs}
              onChange={(e) => setManualCarbs(e.target.value)}
            />
            <input
              type="number"
              placeholder="gord (g)"
              className={inputClass}
              value={manualFat}
              onChange={(e) => setManualFat(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Registrar manualmente"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
