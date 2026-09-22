import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  confirmNutritionPlanSchema,
  generateDraftNutritionPlanSchema,
  logFoodDiaryEntrySchema,
  logHydrationSchema,
  lookupBarcodeSchema,
  searchFoodSchema,
  type ConfirmNutritionPlanInput,
  type GenerateDraftNutritionPlanInput,
  type LogFoodDiaryEntryInput,
  type LogHydrationInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import { NutritionistGuard } from "../../auth/presentation/guards/nutritionist.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { ConfirmNutritionPlanUseCase } from "../application/use-cases/confirm-nutrition-plan.use-case";
import { GenerateDraftNutritionPlanUseCase } from "../application/use-cases/generate-draft-nutrition-plan.use-case";
import { GetClientNutritionPlanUseCase } from "../application/use-cases/get-client-nutrition-plan.use-case";
import { GetDailyFoodDiaryUseCase } from "../application/use-cases/get-daily-food-diary.use-case";
import { GetHydrationUseCase } from "../application/use-cases/get-hydration.use-case";
import { GetMyActiveNutritionPlanUseCase } from "../application/use-cases/get-my-active-nutrition-plan.use-case";
import { GetWeeklyAdherenceSummaryUseCase } from "../application/use-cases/get-weekly-adherence-summary.use-case";
import { LogFoodDiaryEntryUseCase } from "../application/use-cases/log-food-diary-entry.use-case";
import { LogHydrationUseCase } from "../application/use-cases/log-hydration.use-case";
import { LookupBarcodeUseCase } from "../application/use-cases/lookup-barcode.use-case";
import { SearchFoodUseCase } from "../application/use-cases/search-food.use-case";
import {
  toPublicFoodDiaryEntry,
  toPublicFoodItemCache,
  toPublicHydrationLog,
  toPublicNutritionPlan,
} from "./nutrition.serializer";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// PRD 08 §4/§5 — the Nutrition Module. Draft generation/confirmation is
// Professional(NUTRITIONIST)/Admin-only (NutritionistGuard); the food
// diary/hydration are Client-only writes with Professional/Admin read-only
// views — there is deliberately no mutating diary/hydration route a
// Professional could hit (§4's "Professional 👁 view" row has no write
// counterpart anywhere on this controller).
@Controller("nutrition")
export class NutritionController {
  constructor(
    private readonly generateDraft: GenerateDraftNutritionPlanUseCase,
    private readonly confirmPlan: ConfirmNutritionPlanUseCase,
    private readonly getClientPlan: GetClientNutritionPlanUseCase,
    private readonly getMyActivePlan: GetMyActiveNutritionPlanUseCase,
    private readonly lookupBarcode: LookupBarcodeUseCase,
    private readonly searchFood: SearchFoodUseCase,
    private readonly logDiaryEntry: LogFoodDiaryEntryUseCase,
    private readonly getDailyDiary: GetDailyFoodDiaryUseCase,
    private readonly logHydration: LogHydrationUseCase,
    private readonly getHydration: GetHydrationUseCase,
    private readonly getWeeklyAdherence: GetWeeklyAdherenceSummaryUseCase,
  ) {}

  // §5.1 — generates a DRAFT; never visible to the Client until confirmed.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(NutritionistGuard, ApprovalStatusGuard)
  @HttpCode(201)
  @Post("clients/:clientId/draft")
  async generateDraftHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(generateDraftNutritionPlanSchema))
    body: GenerateDraftNutritionPlanInput,
  ) {
    const plan = await this.generateDraft.execute({
      actor: { id: user.id, role: user.role },
      clientId,
      activityLevel: body.activityLevel,
    });
    return toPublicNutritionPlan(plan);
  }

  // §5.2 — confirm/edit → ACTIVE + confirmedByProfessionalAt in one write.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(NutritionistGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Post("plans/:id/confirm")
  async confirmHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(confirmNutritionPlanSchema))
    body: ConfirmNutritionPlanInput,
  ) {
    const plan = await this.confirmPlan.execute({
      actor: { id: user.id, role: user.role },
      planId: id,
      data: body,
    });
    return toPublicNutritionPlan(plan);
  }

  // §7 — the Nutritionist-only review screen: latest plan of ANY status.
  // Response is wrapped ({ plan: ... }) rather than a bare top-level value —
  // NestJS's ExpressAdapter sends a bare `null`/`undefined` return as an
  // empty body (no "null" JSON text), not `{"plan":null}`, which would make
  // "no plan yet" indistinguishable from a transport-level empty response.
  // Same wrapping convention PRD 03's intake controller already established
  // ({ intake: ... }).
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(NutritionistGuard, ApprovalStatusGuard)
  @Get("clients/:clientId/plan")
  async getClientPlanHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    const plan = await this.getClientPlan.execute({
      actor: { id: user.id, role: user.role },
      clientId,
    });
    return { plan: plan ? toPublicNutritionPlan(plan) : null };
  }

  // §7 — the Client's own view: ACTIVE only, structurally (see the
  // repository/use-case contract) incapable of returning a DRAFT.
  @Roles(Role.CLIENT)
  @Get("mine/plan")
  async getMyPlanHandler(@CurrentUser() user: UserWithProfiles) {
    const plan = await this.getMyActivePlan.execute({ clientId: user.id });
    return { plan: plan ? toPublicNutritionPlan(plan) : null };
  }

  // §5.3 — barcode lookup; a null `item` (not an error) means "not found",
  // the frontend's cue to fall back to manual entry. Wrapped for the same
  // reason as the plan endpoints above.
  @Roles(Role.CLIENT)
  @Get("food/barcode/:barcode")
  async lookupBarcodeHandler(@Param("barcode") barcode: string) {
    lookupBarcodeSchema.parse({ barcode });
    const item = await this.lookupBarcode.execute({ barcode });
    return { item: item ? toPublicFoodItemCache(item) : null };
  }

  // §5.3 — generic/whole-food search (USDA).
  @Roles(Role.CLIENT)
  @Get("food/search")
  async searchFoodHandler(@Query("query") query: string) {
    const parsed = searchFoodSchema.parse({ query });
    const items = await this.searchFood.execute({ query: parsed.query });
    return items.map(toPublicFoodItemCache);
  }

  // §5.3 — logs one diary entry (cached food or manual-entry fallback).
  @Roles(Role.CLIENT)
  @HttpCode(201)
  @Post("diary")
  async logDiaryHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(logFoodDiaryEntrySchema)) body: LogFoodDiaryEntryInput,
  ) {
    const entry = await this.logDiaryEntry.execute({ clientId: user.id, data: body });
    return toPublicFoodDiaryEntry(entry);
  }

  // §5.3/§5.5 — the Client's own day: entries + totals vs. target + nudges.
  @Roles(Role.CLIENT)
  @Get("mine/diary")
  async getMyDiaryHandler(
    @CurrentUser() user: UserWithProfiles,
    @Query("date") date?: string,
  ) {
    const result = await this.getDailyDiary.execute({
      viewer: { id: user.id, role: user.role },
      clientId: user.id,
      date: date ?? todayIso(),
      nowHour: new Date().getUTCHours(),
    });
    return {
      entries: result.entries.map(toPublicFoodDiaryEntry),
      totals: result.totals,
      activeTarget: result.activeTarget ? toPublicNutritionPlan(result.activeTarget) : null,
      nudges: result.nudges,
    };
  }

  // §4 — Professional's read-only view of a linked Client's day.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(NutritionistGuard, ApprovalStatusGuard)
  @Get("clients/:clientId/diary")
  async getClientDiaryHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
    @Query("date") date?: string,
  ) {
    const result = await this.getDailyDiary.execute({
      viewer: { id: user.id, role: user.role },
      clientId,
      date: date ?? todayIso(),
      nowHour: new Date().getUTCHours(),
    });
    return {
      entries: result.entries.map(toPublicFoodDiaryEntry),
      totals: result.totals,
      activeTarget: result.activeTarget ? toPublicNutritionPlan(result.activeTarget) : null,
      nudges: result.nudges,
    };
  }

  // §5.4 — the Client's own hydration counter.
  @Roles(Role.CLIENT)
  @HttpCode(200)
  @Post("hydration")
  async logHydrationHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(logHydrationSchema)) body: LogHydrationInput,
  ) {
    const log = await this.logHydration.execute({
      clientId: user.id,
      date: todayIso(),
      amount: body.amount,
    });
    return toPublicHydrationLog(log, todayIso());
  }

  @Roles(Role.CLIENT)
  @Get("mine/hydration")
  async getMyHydrationHandler(
    @CurrentUser() user: UserWithProfiles,
    @Query("date") date?: string,
  ) {
    const d = date ?? todayIso();
    const log = await this.getHydration.execute({ clientId: user.id, date: d });
    return toPublicHydrationLog(log, d);
  }

  // §5.6/§10 — weekly adherence, Client's own.
  @Roles(Role.CLIENT)
  @Get("mine/weekly-summary")
  async getMyWeeklySummaryHandler(@CurrentUser() user: UserWithProfiles) {
    return this.getWeeklyAdherence.execute({
      viewer: { id: user.id, role: user.role },
      clientId: user.id,
      now: new Date(),
    });
  }

  // §5.6/§10 — weekly adherence, Professional's view of a linked Client —
  // same use-case/same numbers as the Client's own endpoint (parity AC).
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(NutritionistGuard, ApprovalStatusGuard)
  @Get("clients/:clientId/weekly-summary")
  async getClientWeeklySummaryHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.getWeeklyAdherence.execute({
      viewer: { id: user.id, role: user.role },
      clientId,
      now: new Date(),
    });
  }
}
