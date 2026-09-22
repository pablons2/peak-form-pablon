import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { ClientTrainingExecutionModule } from "../client-training-execution/client-training-execution.module";
import { NutritionModule } from "../nutrition/nutrition.module";
import { ProductivityModule } from "../productivity/productivity.module";
import { MessagingModule } from "../messaging/messaging.module";
import { BodyAssessmentsModule } from "../body-assessments/body-assessments.module";
import { GetTodayDashboardUseCase } from "./application/use-cases/get-today-dashboard.use-case";
import { GetWeekDashboardUseCase } from "./application/use-cases/get-week-dashboard.use-case";
import { DashboardController } from "./presentation/dashboard.controller";

// PRD 09 — Today/This Week Dashboard. A pure read-side composition module
// (§6 — no new persisted entity, no own repository/port): it depends on
// every owning module for exactly the use-case each already exposes for
// its own "self" view (ClientTrainingExecutionModule's GetTodaySessionUseCase
// + ListMySessionsUseCase, NutritionModule's GetDailyFoodDiaryUseCase,
// ProductivityModule's GetTodayUseCase, MessagingModule's
// ListMyThreadsUseCase — each exported by its module specifically for this
// phase, same "the owning module exports for its new consumer" precedent
// PRD 05/07/08 established) plus BODY_ASSESSMENT_REPOSITORY and
// CHECK_IN_SCHEDULE_REPOSITORY/LINK_REPOSITORY directly (their existing
// "self" query is a trivial repository call with no extra business rule to
// go through a use-case for).
@Module({
  imports: [
    SharedModule,
    AuthModule,
    RelationshipsModule,
    ClientTrainingExecutionModule,
    NutritionModule,
    ProductivityModule,
    MessagingModule,
    BodyAssessmentsModule,
  ],
  controllers: [DashboardController],
  providers: [GetTodayDashboardUseCase, GetWeekDashboardUseCase],
})
export class DashboardModule {}
