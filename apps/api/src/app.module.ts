import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule, seconds } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RelationshipsModule } from "./relationships/relationships.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { IntakeModule } from "./intake/intake.module";
import { TrainingPlansModule } from "./training-plans/training-plans.module";
import { BodyAssessmentsModule } from "./body-assessments/body-assessments.module";
import { ClientTrainingExecutionModule } from "./client-training-execution/client-training-execution.module";
import { NutritionModule } from "./nutrition/nutrition.module";
import { MessagingModule } from "./messaging/messaging.module";
import { ProductivityModule } from "./productivity/productivity.module";

// Feature modules land here as each PRD (docs/prds/01-*.md onward) is
// implemented — see docs/IMPLEMENTATION_CHECKLIST.md for order.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Base doc §9 — rate limiting on auth and write endpoints. This is the
    // app-wide default; auth.controller.ts applies stricter @Throttle()
    // overrides on login/signup/password-reset specifically.
    ThrottlerModule.forRoot([
      { name: "default", ttl: seconds(60), limit: 100 },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    RelationshipsModule,
    ExercisesModule,
    IntakeModule,
    TrainingPlansModule,
    BodyAssessmentsModule,
    ClientTrainingExecutionModule,
    NutritionModule,
    MessagingModule,
    ProductivityModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
