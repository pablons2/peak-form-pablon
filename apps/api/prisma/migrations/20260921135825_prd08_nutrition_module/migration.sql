-- CreateEnum
CREATE TYPE "NutritionPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('OPEN_FOOD_FACTS', 'USDA', 'CUSTOM');

-- CreateTable
CREATE TABLE "nutrition_plans" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nutritionistId" TEXT NOT NULL,
    "calorieTarget" INTEGER NOT NULL,
    "macroTargets" JSONB NOT NULL,
    "status" "NutritionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedByProfessionalAt" TIMESTAMP(3),
    "mealPlan" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_diary_entries" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "foodItemCacheId" TEXT,
    "customFoodName" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "mealSlot" "MealSlot" NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nutrientsSnapshot" JSONB NOT NULL,

    CONSTRAINT "food_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_item_cache" (
    "id" TEXT NOT NULL,
    "source" "FoodSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nutrients" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_item_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hydration_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hydration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nutrition_plans_clientId_status_idx" ON "nutrition_plans"("clientId", "status");

-- CreateIndex
CREATE INDEX "food_diary_entries_clientId_loggedAt_idx" ON "food_diary_entries"("clientId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "food_item_cache_source_externalId_key" ON "food_item_cache"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "hydration_logs_clientId_date_key" ON "hydration_logs"("clientId", "date");

-- AddForeignKey
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_nutritionistId_fkey" FOREIGN KEY ("nutritionistId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_foodItemCacheId_fkey" FOREIGN KEY ("foodItemCacheId") REFERENCES "food_item_cache"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hydration_logs" ADD CONSTRAINT "hydration_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
