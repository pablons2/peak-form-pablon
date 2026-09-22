import { Injectable, Logger } from "@nestjs/common";
import type {
  NormalizedFoodItem,
  UsdaFoodDataClient,
} from "../domain/ports/food-lookup.port";

// PRD 08 §5.3 — generic/whole-food search via USDA FoodData Central, which
// requires a free data.gov API key (~1,000 req/hour). This environment does
// not have a real USDA_FOODDATA_API_KEY configured (checked: the env var is
// present but empty, same situation as PRD 01's Google OAuth credentials) —
// this adapter is fully coded against the real, documented FoodData Central
// `/foods/search` response shape, but could not be exercised end-to-end
// against the live API in this session. See the checklist's Phase 10 note.
@Injectable()
export class HttpUsdaFoodDataClient implements UsdaFoodDataClient {
  private readonly logger = new Logger(HttpUsdaFoodDataClient.name);
  private readonly baseUrl =
    process.env.USDA_FOODDATA_BASE_URL ?? "https://api.nal.usda.gov/fdc/v1";

  async search(query: string): Promise<NormalizedFoodItem[]> {
    const apiKey = process.env.USDA_FOODDATA_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        "USDA_FOODDATA_API_KEY not configured — USDA search disabled, returning no results",
      );
      return [];
    }

    let res: Response;
    try {
      const url = new URL(`${this.baseUrl}/foods/search`);
      url.searchParams.set("query", query);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("pageSize", "10");
      res = await fetch(url.toString());
    } catch (err) {
      this.logger.warn(`USDA FoodData Central search failed: ${String(err)}`);
      return [];
    }
    if (!res.ok) return [];

    const body = (await res.json()) as {
      foods?: Array<{
        fdcId: number;
        description: string;
        foodNutrients?: Array<{ nutrientName: string; value: number }>;
      }>;
    };

    return (body.foods ?? []).map((food) => {
      const byName = (name: string) =>
        food.foodNutrients?.find((n) => n.nutrientName === name)?.value ?? 0;
      return {
        externalId: String(food.fdcId),
        name: food.description,
        nutrients: {
          calories: byName("Energy"),
          protein: byName("Protein"),
          carbs: byName("Carbohydrate, by difference"),
          fat: byName("Total lipid (fat)"),
        },
      };
    });
  }
}
