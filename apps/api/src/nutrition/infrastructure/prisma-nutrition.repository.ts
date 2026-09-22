import { Injectable } from "@nestjs/common";
import {
  NutritionPlanStatus,
  type FoodDiaryEntry,
  type FoodItemCache,
  type FoodSource,
  type HydrationLog,
  type NutritionPlan,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ConfirmPlanData,
  CreateDraftData,
  CreateFoodDiaryEntryData,
  NutritionRepository,
  UpsertFoodItemCacheData,
} from "../domain/ports/nutrition.repository.port";

@Injectable()
export class PrismaNutritionRepository implements NutritionRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDraft(data: CreateDraftData): Promise<NutritionPlan> {
    return this.prisma.nutritionPlan.create({
      data: {
        clientId: data.clientId,
        nutritionistId: data.nutritionistId,
        calorieTarget: data.calorieTarget,
        macroTargets: data.macroTargets as Prisma.InputJsonValue,
        status: NutritionPlanStatus.DRAFT,
      },
    });
  }

  findById(id: string): Promise<NutritionPlan | null> {
    return this.prisma.nutritionPlan.findUnique({ where: { id } });
  }

  findActiveForClient(clientId: string): Promise<NutritionPlan | null> {
    return this.prisma.nutritionPlan.findFirst({
      where: { clientId, status: NutritionPlanStatus.ACTIVE },
      orderBy: { confirmedByProfessionalAt: "desc" },
    });
  }

  findLatestForClient(clientId: string): Promise<NutritionPlan | null> {
    return this.prisma.nutritionPlan.findFirst({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  confirm(id: string, data: ConfirmPlanData): Promise<NutritionPlan> {
    return this.prisma.nutritionPlan.update({
      where: { id },
      data: {
        calorieTarget: data.calorieTarget,
        macroTargets: data.macroTargets as Prisma.InputJsonValue,
        mealPlan: (data.mealPlan ?? undefined) as Prisma.InputJsonValue | undefined,
        status: NutritionPlanStatus.ACTIVE,
        confirmedByProfessionalAt: new Date(),
      },
    });
  }

  createFoodDiaryEntry(data: CreateFoodDiaryEntryData): Promise<FoodDiaryEntry> {
    return this.prisma.foodDiaryEntry.create({
      data: {
        clientId: data.clientId,
        foodItemCacheId: data.foodItemCacheId ?? null,
        customFoodName: data.customFoodName ?? null,
        quantity: data.quantity,
        mealSlot: data.mealSlot,
        loggedAt: data.loggedAt ?? new Date(),
        nutrientsSnapshot: data.nutrientsSnapshot as Prisma.InputJsonValue,
      },
    });
  }

  listFoodDiaryEntriesForClientOnDate(
    clientId: string,
    date: string,
  ): Promise<FoodDiaryEntry[]> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    return this.prisma.foodDiaryEntry.findMany({
      where: { clientId, loggedAt: { gte: start, lte: end } },
      orderBy: { loggedAt: "asc" },
    });
  }

  listFoodDiaryEntriesForClientSince(
    clientId: string,
    since: Date,
  ): Promise<FoodDiaryEntry[]> {
    return this.prisma.foodDiaryEntry.findMany({
      where: { clientId, loggedAt: { gte: since } },
      orderBy: { loggedAt: "asc" },
    });
  }

  findFoodItemCache(
    source: FoodSource,
    externalId: string,
  ): Promise<FoodItemCache | null> {
    return this.prisma.foodItemCache.findUnique({
      where: { source_externalId: { source, externalId } },
    });
  }

  findFoodItemCacheById(id: string): Promise<FoodItemCache | null> {
    return this.prisma.foodItemCache.findUnique({ where: { id } });
  }

  upsertFoodItemCache(data: UpsertFoodItemCacheData): Promise<FoodItemCache> {
    return this.prisma.foodItemCache.upsert({
      where: { source_externalId: { source: data.source, externalId: data.externalId } },
      create: {
        source: data.source,
        externalId: data.externalId,
        name: data.name,
        nutrients: data.nutrients as Prisma.InputJsonValue,
      },
      update: {
        name: data.name,
        nutrients: data.nutrients as Prisma.InputJsonValue,
        fetchedAt: new Date(),
      },
    });
  }

  getHydration(clientId: string, date: string): Promise<HydrationLog | null> {
    return this.prisma.hydrationLog.findUnique({
      where: { clientId_date: { clientId, date: new Date(`${date}T00:00:00.000Z`) } },
    });
  }

  incrementHydration(clientId: string, date: string, by: number): Promise<HydrationLog> {
    const day = new Date(`${date}T00:00:00.000Z`);
    return this.prisma.hydrationLog.upsert({
      where: { clientId_date: { clientId, date: day } },
      create: { clientId, date: day, amount: by },
      update: { amount: { increment: by } },
    });
  }
}
