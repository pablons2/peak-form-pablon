import type {
  FoodDiaryEntry,
  FoodItemCache,
  FoodSource,
  HydrationLog,
  MealSlot,
  NutritionPlan,
} from "@prisma/client";

export const NUTRITION_REPOSITORY = Symbol("NUTRITION_REPOSITORY");

export interface CreateDraftData {
  clientId: string;
  nutritionistId: string;
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fat: number };
}

export interface ConfirmPlanData {
  calorieTarget: number;
  macroTargets: { protein: number; carbs: number; fat: number };
  mealPlan?: Record<string, unknown> | null;
}

export interface CreateFoodDiaryEntryData {
  clientId: string;
  foodItemCacheId?: string | null;
  customFoodName?: string | null;
  quantity: number;
  mealSlot: MealSlot;
  loggedAt?: Date;
  nutrientsSnapshot: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface UpsertFoodItemCacheData {
  source: FoodSource;
  externalId: string;
  name: string;
  nutrients: { calories: number; protein: number; carbs: number; fat: number };
}

/// Infrastructure implements this (base doc §7.2 DIP). §3's Non-Goal ("no
/// code path sets ACTIVE without confirmedByProfessionalAt") is enforced by
/// `confirm`'s own signature: it is the only write that can move a plan out
/// of DRAFT, and it always sets both fields in the same call — there is no
/// generic `update(status)` method that could set one without the other.
export interface NutritionRepository {
  createDraft(data: CreateDraftData): Promise<NutritionPlan>;
  findById(id: string): Promise<NutritionPlan | null>;
  /// The Client-facing read: only ever returns an ACTIVE plan (or null) —
  /// callers cannot accidentally ask this method for a DRAFT (§7's
  /// "structurally incapable of leaking" requirement lives here, not just
  /// in a serializer that could be reused carelessly).
  findActiveForClient(clientId: string): Promise<NutritionPlan | null>;
  /// The Nutritionist-facing read: latest plan of any status for review.
  findLatestForClient(clientId: string): Promise<NutritionPlan | null>;
  confirm(id: string, data: ConfirmPlanData): Promise<NutritionPlan>;

  createFoodDiaryEntry(data: CreateFoodDiaryEntryData): Promise<FoodDiaryEntry>;
  listFoodDiaryEntriesForClientOnDate(
    clientId: string,
    date: string,
  ): Promise<FoodDiaryEntry[]>;
  /// Distinct clientIds holding an ACTIVE plan — PRD 12's missed-food-log
  /// job candidates (only someone with a target can "miss" logging it).
  listActivePlanClientIds(): Promise<string[]>;
  /// How many entries a Client logged on `date` ("YYYY-MM-DD", same
  /// UTC-day convention as listFoodDiaryEntriesForClientOnDate) — the job
  /// only needs the zero/non-zero answer, not the rows.
  countFoodDiaryEntriesOn(clientId: string, date: string): Promise<number>;
  listFoodDiaryEntriesForClientSince(
    clientId: string,
    since: Date,
  ): Promise<FoodDiaryEntry[]>;

  findFoodItemCache(
    source: FoodSource,
    externalId: string,
  ): Promise<FoodItemCache | null>;
  findFoodItemCacheById(id: string): Promise<FoodItemCache | null>;
  upsertFoodItemCache(data: UpsertFoodItemCacheData): Promise<FoodItemCache>;

  getHydration(clientId: string, date: string): Promise<HydrationLog | null>;
  incrementHydration(clientId: string, date: string, by: number): Promise<HydrationLog>;
}
