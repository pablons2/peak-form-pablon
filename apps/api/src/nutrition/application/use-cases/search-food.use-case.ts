import { Injectable } from "@nestjs/common";
import type { FoodItemCache } from "@prisma/client";
import { FoodLookupService } from "../food-lookup.service";

@Injectable()
export class SearchFoodUseCase {
  constructor(private readonly lookup: FoodLookupService) {}

  execute(input: { query: string }): Promise<FoodItemCache[]> {
    return this.lookup.searchFood(input.query);
  }
}
