import { Injectable, Logger } from "@nestjs/common";
import type {
  NormalizedFoodItem,
  OpenFoodFactsClient,
} from "../domain/ports/food-lookup.port";

// PRD 08 §5.3 — no API key required. Verified live against the real public
// API during implementation: a genuine barcode returns `status: 1` with a
// `product` object; an unknown/invalid barcode returns HTTP 200 with
// `status: 0` (`status_verbose: "no code or invalid code"`) — the PRD's own
// caveat, confirmed against the real endpoint rather than assumed.
@Injectable()
export class HttpOpenFoodFactsClient implements OpenFoodFactsClient {
  private readonly logger = new Logger(HttpOpenFoodFactsClient.name);
  private readonly baseUrl =
    process.env.OPEN_FOOD_FACTS_BASE_URL ??
    "https://world.openfoodfacts.org/api/v2";

  async lookupByBarcode(barcode: string): Promise<NormalizedFoodItem | null> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/product/${encodeURIComponent(barcode)}.json`);
    } catch (err) {
      this.logger.warn(`Open Food Facts lookup failed: ${String(err)}`);
      return null;
    }
    if (!res.ok) return null;

    const body = (await res.json()) as {
      status: number;
      product?: {
        product_name?: string;
        nutriments?: Record<string, number>;
      };
    };

    // The critical check per §5.3/§10: `status` in the JSON body, not HTTP
    // status — a "not found" barcode still returns HTTP 200.
    if (body.status !== 1 || !body.product) return null;

    const n = body.product.nutriments ?? {};
    return {
      externalId: barcode,
      name: body.product.product_name ?? "Unknown product",
      nutrients: {
        calories: n["energy-kcal_100g"] ?? 0,
        protein: n["proteins_100g"] ?? 0,
        carbs: n["carbohydrates_100g"] ?? 0,
        fat: n["fat_100g"] ?? 0,
      },
    };
  }
}
