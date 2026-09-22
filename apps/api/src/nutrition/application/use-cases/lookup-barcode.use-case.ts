import { Injectable } from "@nestjs/common";
import type { FoodItemCache } from "@prisma/client";
import { FoodLookupService } from "../food-lookup.service";

@Injectable()
export class LookupBarcodeUseCase {
  constructor(private readonly lookup: FoodLookupService) {}

  execute(input: { barcode: string }): Promise<FoodItemCache | null> {
    return this.lookup.lookupBarcode(input.barcode);
  }
}
