import { Injectable, Logger } from "@nestjs/common";
import type {
  NormalizedFoodItem,
  TacoFoodClient,
} from "../domain/ports/food-lookup.port";

// PRD 08 §5.3 — Brazilian whole-food search against the self-hosted
// taco-api GraphQL service (raulfdm/taco-api, run via docker-compose).
// TACO nutrient values are per 100g of the food as published in the
// Tabela Brasileira de Composição de Alimentos — the same per-100g basis
// FoodItemCache stores, so no unit conversion happens here. Like the USDA
// adapter, an unconfigured TACO_API_URL or an unreachable/failed query
// degrades to an empty result list, never a thrown error.
@Injectable()
export class HttpTacoApiClient implements TacoFoodClient {
  private readonly logger = new Logger(HttpTacoApiClient.name);

  async search(query: string): Promise<NormalizedFoodItem[]> {
    const url = process.env.TACO_API_URL;
    if (!url) {
      this.logger.warn(
        "TACO_API_URL not configured — TACO search disabled, returning no results",
      );
      return [];
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query FoodByName($name: String!) {
              getFoodByName(name: $name) {
                id
                name
                nutrients {
                  kcal
                  protein
                  lipids
                  carbohydrates
                }
              }
            }
          `,
          variables: { name: query },
        }),
      });
    } catch (err) {
      this.logger.warn(`TACO API search failed: ${String(err)}`);
      return [];
    }
    if (!res.ok) return [];

    const body = (await res.json().catch(() => null)) as {
      data?: {
        getFoodByName?: Array<{
          id: number;
          name: string;
          nutrients?: {
            kcal?: number | null;
            protein?: number | null;
            lipids?: number | null;
            carbohydrates?: number | null;
          } | null;
        }>;
      } | null;
    } | null;
    if (!body?.data?.getFoodByName) return [];

    return body.data.getFoodByName.slice(0, 10).map((food) => ({
      externalId: String(food.id),
      name: food.name,
      nutrients: {
        calories: food.nutrients?.kcal ?? 0,
        protein: food.nutrients?.protein ?? 0,
        carbs: food.nutrients?.carbohydrates ?? 0,
        fat: food.nutrients?.lipids ?? 0,
      },
    }));
  }
}
