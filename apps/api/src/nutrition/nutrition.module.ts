import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { BodyAssessmentsModule } from "../body-assessments/body-assessments.module";
import { FoodLookupService } from "./application/food-lookup.service";
import { NutritionAccess } from "./application/nutrition-access.service";
import { ConfirmNutritionPlanUseCase } from "./application/use-cases/confirm-nutrition-plan.use-case";
import { GenerateDraftNutritionPlanUseCase } from "./application/use-cases/generate-draft-nutrition-plan.use-case";
import { GetClientNutritionPlanUseCase } from "./application/use-cases/get-client-nutrition-plan.use-case";
import { GetDailyFoodDiaryUseCase } from "./application/use-cases/get-daily-food-diary.use-case";
import { GetHydrationUseCase } from "./application/use-cases/get-hydration.use-case";
import { GetMyActiveNutritionPlanUseCase } from "./application/use-cases/get-my-active-nutrition-plan.use-case";
import { GetWeeklyAdherenceSummaryUseCase } from "./application/use-cases/get-weekly-adherence-summary.use-case";
import { LogFoodDiaryEntryUseCase } from "./application/use-cases/log-food-diary-entry.use-case";
import { LogHydrationUseCase } from "./application/use-cases/log-hydration.use-case";
import { LookupBarcodeUseCase } from "./application/use-cases/lookup-barcode.use-case";
import { SearchFoodUseCase } from "./application/use-cases/search-food.use-case";
import {
  OPEN_FOOD_FACTS_CLIENT,
  USDA_FOOD_DATA_CLIENT,
} from "./domain/ports/food-lookup.port";
import { NUTRITION_REPOSITORY } from "./domain/ports/nutrition.repository.port";
import { HttpOpenFoodFactsClient } from "./infrastructure/open-food-facts-client";
import { PrismaNutritionRepository } from "./infrastructure/prisma-nutrition.repository";
import { HttpUsdaFoodDataClient } from "./infrastructure/usda-food-data-client";
import { NutritionController } from "./presentation/nutrition.controller";

// PRD 08 — Nutrition Module. Depends on AuthModule (guards, incl. the new
// NutritionistGuard, + USER_REPOSITORY for the draft's age/sex input),
// RelationshipsModule (LINK_REPOSITORY — the NUTRITIONIST-specialization
// "own linked client" resolution) and BodyAssessmentsModule
// (BODY_ASSESSMENT_REPOSITORY — §5.1's weight/height input, exported by
// Phase 8 specifically for this).
@Module({
  imports: [SharedModule, AuthModule, RelationshipsModule, BodyAssessmentsModule],
  controllers: [NutritionController],
  providers: [
    { provide: NUTRITION_REPOSITORY, useClass: PrismaNutritionRepository },
    { provide: OPEN_FOOD_FACTS_CLIENT, useClass: HttpOpenFoodFactsClient },
    { provide: USDA_FOOD_DATA_CLIENT, useClass: HttpUsdaFoodDataClient },

    NutritionAccess,
    FoodLookupService,

    GenerateDraftNutritionPlanUseCase,
    ConfirmNutritionPlanUseCase,
    GetClientNutritionPlanUseCase,
    GetMyActiveNutritionPlanUseCase,
    LookupBarcodeUseCase,
    SearchFoodUseCase,
    LogFoodDiaryEntryUseCase,
    GetDailyFoodDiaryUseCase,
    LogHydrationUseCase,
    GetHydrationUseCase,
    GetWeeklyAdherenceSummaryUseCase,
  ],
})
export class NutritionModule {}
