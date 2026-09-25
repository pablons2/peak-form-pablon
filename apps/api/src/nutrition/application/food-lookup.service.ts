import { Inject, Injectable } from "@nestjs/common";
import { FoodSource, type FoodItemCache } from "@prisma/client";
import {
  OPEN_FOOD_FACTS_CLIENT,
  TACO_FOOD_CLIENT,
  USDA_FOOD_DATA_CLIENT,
  type OpenFoodFactsClient,
  type TacoFoodClient,
  type UsdaFoodDataClient,
} from "../domain/ports/food-lookup.port";
import {
  NUTRITION_REPOSITORY,
  type NutritionRepository,
} from "../domain/ports/nutrition.repository.port";

// PRD 08 §5.3 — the FoodItemCache normalization layer: a lookup checks the
// cache first (base doc §7.5), falls through to the live API on a miss, and
// writes the normalized result back so the next lookup of the same
// barcode/food doesn't depend on live third-party latency again.
@Injectable()
export class FoodLookupService {
  constructor(
    @Inject(OPEN_FOOD_FACTS_CLIENT) private readonly off: OpenFoodFactsClient,
    @Inject(USDA_FOOD_DATA_CLIENT) private readonly usda: UsdaFoodDataClient,
    @Inject(TACO_FOOD_CLIENT) private readonly taco: TacoFoodClient,
    @Inject(NUTRITION_REPOSITORY) private readonly nutrition: NutritionRepository,
  ) {}

  // §5.3/§10 — a barcode lookup that resolves to Open Food Facts' `status:
  // 0` ("not found") returns null here, never a fabricated/zeroed nutrient
  // object — the caller (the frontend) falls back to manual entry (§7).
  async lookupBarcode(barcode: string): Promise<FoodItemCache | null> {
    const cached = await this.nutrition.findFoodItemCache(
      FoodSource.OPEN_FOOD_FACTS,
      barcode,
    );
    if (cached) return cached;

    const item = await this.off.lookupByBarcode(barcode);
    if (!item) return null;

    return this.nutrition.upsertFoodItemCache({
      source: FoodSource.OPEN_FOOD_FACTS,
      externalId: item.externalId,
      name: item.name,
      nutrients: item.nutrients,
    });
  }

  // §5.3 — generic/whole-food search. TACO (pt-BR names, Brazilian table)
  // is tried first and USDA fills in whatever it didn't match; each result
  // is normalized into the cache as it's returned (so a later diary-log or
  // meal-plan item referencing one of these results resolves the same cache
  // row rather than re-fetching).
  async searchFood(query: string): Promise<FoodItemCache[]> {
    const tacoResults = await this.taco.search(query);
    const results = tacoResults.length > 0 ? tacoResults : await this.usda.search(query);
    return Promise.all(
      results.map((item) =>
        this.nutrition.upsertFoodItemCache({
          source: tacoResults.length > 0 ? FoodSource.TACO : FoodSource.USDA,
          externalId: item.externalId,
          name: item.name,
          nutrients: item.nutrients,
        }),
      ),
    );
  }
}
