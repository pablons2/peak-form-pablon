// PRD 08 — Nutrition Module input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

export const activityLevelSchema = z.enum([
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "VERY_ACTIVE",
  "EXTRA_ACTIVE",
]);
export type ActivityLevelInput = z.infer<typeof activityLevelSchema>;

// §5.1 — draft generation takes no numbers from the caller (they're all
// computed server-side from BodyAssessment/ClientProfile); activityLevel is
// the one input the Nutritionist supplies, since nothing stores it.
export const generateDraftNutritionPlanSchema = z.object({
  activityLevel: activityLevelSchema.optional(),
});
export type GenerateDraftNutritionPlanInput = z.infer<
  typeof generateDraftNutritionPlanSchema
>;

const macroTargetsSchema = z.object({
  protein: z.number().nonnegative().max(2000),
  carbs: z.number().nonnegative().max(2000),
  fat: z.number().nonnegative().max(2000),
});
export type MacroTargetsInput = z.infer<typeof macroTargetsSchema>;

const mealSlotEnumSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
export type MealSlotInput = z.infer<typeof mealSlotEnumSchema>;

// §5.2 — one planned food in a meal slot. Exactly one of the two identity
// paths, same refine rule as the diary entry schema below: a cached food
// (nutrients resolved server-side) or a manual-entry custom food with
// caller-supplied per-100g values. `quantityGrams` is the planned portion;
// the server scales nutrients by it (never trusting caller-computed totals).
const mealPlanItemSchema = z
  .object({
    foodItemCacheId: z.string().trim().min(1).nullish(),
    customFoodName: z.string().trim().min(1).max(200).nullish(),
    customNutrients: z
      .object({
        calories: z.number().nonnegative().max(10000),
        protein: z.number().nonnegative().max(2000),
        carbs: z.number().nonnegative().max(2000),
        fat: z.number().nonnegative().max(2000),
      })
      .nullish(),
    quantityGrams: z.number().positive().max(5000),
  })
  .refine(
    (v) =>
      (v.foodItemCacheId != null) !==
      (v.customFoodName != null && v.customNutrients != null),
    {
      message:
        "Provide either foodItemCacheId, or both customFoodName and customNutrients — not both.",
    },
  );
export type MealPlanItemInput = z.infer<typeof mealPlanItemSchema>;

// Legacy plans (before the structured builder) store `suggestedFoods`
// free-text lists; the builder writes `items`. Both remain readable —
// the serializer/UI render whichever a given plan row carries.
const mealPlanSlotSchema = z.object({
  mealSlot: mealSlotEnumSchema,
  items: z.array(mealPlanItemSchema).max(20).optional(),
  suggestedFoods: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
});
export type MealPlanSlotInput = z.infer<typeof mealPlanSlotSchema>;

const mealPlanSchema = z
  .object({
    slots: z.array(mealPlanSlotSchema).max(10),
  })
  .nullish();
export type MealPlanInput = z.infer<typeof mealPlanSchema>;

// §5.2 — the Nutritionist's structured meal-plan save (builder UI). The
// server resolves each foodItemCacheId, scales nutrients by quantityGrams,
// and stores per-item snapshots + per-slot/day totals — the same
// compute-server-side rule as the food diary.
export const savePlanMealsSchema = z.object({
  slots: z
    .array(
      z.object({
        mealSlot: mealSlotEnumSchema,
        items: z.array(mealPlanItemSchema).max(20),
      }),
    )
    .max(10),
});
export type SavePlanMealsInput = z.infer<typeof savePlanMealsSchema>;

// §5.2 — the Nutritionist's confirm/edit action: sets ACTIVE +
// confirmedByProfessionalAt in the same write, server-side (never
// client-suppliable).
export const confirmNutritionPlanSchema = z.object({
  calorieTarget: z.number().int().positive().max(10000),
  macroTargets: macroTargetsSchema,
  mealPlan: mealPlanSchema,
});
export type ConfirmNutritionPlanInput = z.infer<typeof confirmNutritionPlanSchema>;

export const lookupBarcodeSchema = z.object({
  barcode: z.string().trim().min(1).max(64),
});
export type LookupBarcodeInput = z.infer<typeof lookupBarcodeSchema>;

export const searchFoodSchema = z.object({
  query: z.string().trim().min(1).max(200),
});
export type SearchFoodInput = z.infer<typeof searchFoodSchema>;

// §5.3 — a diary entry either references a resolved FoodItemCache row
// (`foodItemCacheId`) or is a manual-entry fallback (`customFoodName` +
// caller-supplied nutrients for the logged quantity) — exactly one of the
// two, enforced by `.refine` below rather than two separate endpoints.
export const logFoodDiaryEntrySchema = z
  .object({
    foodItemCacheId: z.string().trim().min(1).nullish(),
    customFoodName: z.string().trim().min(1).max(200).nullish(),
    customNutrients: z
      .object({
        calories: z.number().nonnegative().max(10000),
        protein: z.number().nonnegative().max(2000),
        carbs: z.number().nonnegative().max(2000),
        fat: z.number().nonnegative().max(2000),
      })
      .nullish(),
    quantity: z.number().positive().max(10000),
    mealSlot: mealSlotEnumSchema,
  })
  .refine(
    (v) =>
      (v.foodItemCacheId != null) !==
      (v.customFoodName != null && v.customNutrients != null),
    {
      message:
        "Provide either foodItemCacheId, or both customFoodName and customNutrients — not both.",
    },
  );
export type LogFoodDiaryEntryInput = z.infer<typeof logFoodDiaryEntrySchema>;

export const logHydrationSchema = z.object({
  amount: z.number().int().positive().max(50),
});
export type LogHydrationInput = z.infer<typeof logHydrationSchema>;
