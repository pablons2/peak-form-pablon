import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { IntakeAccess } from "./application/intake-access.service";
import { IntakeGatingService } from "./application/intake-gating.service";
import { AddProfessionalAnnotationUseCase } from "./application/use-cases/add-professional-annotation.use-case";
import { CompleteIntakeUseCase } from "./application/use-cases/complete-intake.use-case";
import { GetClientIntakeUseCase } from "./application/use-cases/get-client-intake.use-case";
import { GetMyIntakeUseCase } from "./application/use-cases/get-my-intake.use-case";
import { ListClientIntakeVersionsUseCase } from "./application/use-cases/list-client-intake-versions.use-case";
import { SkipIntakeUseCase } from "./application/use-cases/skip-intake.use-case";
import { StartOrResumeIntakeUseCase } from "./application/use-cases/start-or-resume-intake.use-case";
import { UpdateIntakeUseCase } from "./application/use-cases/update-intake.use-case";
import { INTAKE_REPOSITORY } from "./domain/ports/intake.repository.port";
import { PrismaIntakeRepository } from "./infrastructure/prisma-intake.repository";
import { IntakeController } from "./presentation/intake.controller";

// PRD 03 — Onboarding / Intake. Depends on AuthModule (guards) and
// RelationshipsModule (LINK_REPOSITORY — IntakeAccess resolves "own linked
// clients" the same way PRD 05's ExerciseAccess does). INTAKE_REPOSITORY and
// IntakeGatingService are exported so PRD 06's plan-creation use-case can
// consume the completion-gating flag in-process, the same cross-module
// pattern PRD 02 established with LINK_REPOSITORY.
@Module({
  imports: [SharedModule, AuthModule, RelationshipsModule],
  controllers: [IntakeController],
  providers: [
    { provide: INTAKE_REPOSITORY, useClass: PrismaIntakeRepository },

    IntakeAccess,
    IntakeGatingService,

    StartOrResumeIntakeUseCase,
    UpdateIntakeUseCase,
    CompleteIntakeUseCase,
    SkipIntakeUseCase,
    GetMyIntakeUseCase,
    GetClientIntakeUseCase,
    ListClientIntakeVersionsUseCase,
    AddProfessionalAnnotationUseCase,
  ],
  exports: [INTAKE_REPOSITORY, IntakeGatingService],
})
export class IntakeModule {}
