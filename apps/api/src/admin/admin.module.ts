import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NutritionModule } from "../nutrition/nutrition.module";
import { SharedModule } from "../shared/shared.module";
import { TrainingPlansModule } from "../training-plans/training-plans.module";
import { GetAdminAnalyticsUseCase } from "./application/use-cases/get-admin-analytics.use-case";
import { GetAuditLogUseCase } from "./application/use-cases/get-audit-log.use-case";
import { AdminConsoleController } from "./presentation/admin-console.controller";

// PRD 13 — Admin Console's own cross-cutting surface: the audit log reader
// (SharedModule's AuditLogService) and aggregate analytics (composes
// AuthModule's USER_REPOSITORY, TrainingPlansModule's SESSION_REPOSITORY,
// and NutritionModule's GetWeeklyAdherenceSummaryUseCase). Every other
// Admin Console requirement (§5.1-§5.4) is already served by its owning
// module's own admin-prefixed controller — this module doesn't duplicate
// those, only adds what didn't exist yet.
@Module({
  imports: [SharedModule, AuthModule, TrainingPlansModule, NutritionModule],
  controllers: [AdminConsoleController],
  providers: [GetAuditLogUseCase, GetAdminAnalyticsUseCase],
})
export class AdminModule {}
