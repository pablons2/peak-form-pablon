-- AlterTable: add TACO source to the food-item cache enum (PRD 08 §5.3 —
-- self-hosted taco-api as a third normalized food source).
ALTER TYPE "FoodSource" ADD VALUE IF NOT EXISTS 'TACO';
