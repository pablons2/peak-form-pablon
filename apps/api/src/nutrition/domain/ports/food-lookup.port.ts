// PRD 08 §5.3 — the two external food-data sources, each behind its own
// small port (base doc §8.2 / PRD 15 §5.2's "genuinely external dependency
// lives behind a port" pattern, same shape as GoogleTokenVerifier/Mailer).
// Normalized shape both return: nutrients per 100g, which FoodItemCache
// stores and a diary entry's quantity math scales from.
export interface NormalizedFoodItem {
  externalId: string;
  name: string;
  /// Per-100g macro/calorie values.
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const OPEN_FOOD_FACTS_CLIENT = Symbol("OPEN_FOOD_FACTS_CLIENT");

/// §5.3/§10 — barcode/packaged-food lookup. `status: 0` in the JSON body
/// (not HTTP status — Open Food Facts returns HTTP 200 either way) means
/// "not found"; the port surfaces that as `null`, never throws, so callers
/// can't mistake it for a transport failure.
export interface OpenFoodFactsClient {
  lookupByBarcode(barcode: string): Promise<NormalizedFoodItem | null>;
}

export const USDA_FOOD_DATA_CLIENT = Symbol("USDA_FOOD_DATA_CLIENT");

/// §5.3 — generic/whole-food search, requires USDA_FOODDATA_API_KEY. A
/// disabled/unconfigured client (no key present) returns an empty list
/// rather than throwing, so the food-diary search UI degrades to
/// "Open Food Facts + cache + manual entry only" instead of a hard error.
export interface UsdaFoodDataClient {
  search(query: string): Promise<NormalizedFoodItem[]>;
}
