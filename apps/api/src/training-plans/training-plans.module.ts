import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { ExercisesModule } from "../exercises/exercises.module";
import { IntakeModule } from "../intake/intake.module";
import { ClonePlanService } from "./application/clone-plan.service";
import { ContraindicationWarningService } from "./application/contraindication-warning.service";
import { SessionGenerationService } from "./application/session-generation.service";
import { TrainingPlanAccess } from "./application/training-plan-access.service";
import { AssignStarterTemplateUseCase } from "./application/use-cases/assign-starter-template.use-case";
import { CancelSessionUseCase } from "./application/use-cases/cancel-session.use-case";
import { CloneMesocycleUseCase } from "./application/use-cases/clone-mesocycle.use-case";
import { ClonePlanUseCase } from "./application/use-cases/clone-plan.use-case";
import { CreateMesocycleUseCase } from "./application/use-cases/create-mesocycle.use-case";
import { CreateStarterTemplateUseCase } from "./application/use-cases/create-starter-template.use-case";
import { CreateTrainingPlanUseCase } from "./application/use-cases/create-training-plan.use-case";
import { GetSessionUseCase } from "./application/use-cases/get-session.use-case";
import { GetTrainingPlanUseCase } from "./application/use-cases/get-training-plan.use-case";
import { ListSessionsUseCase } from "./application/use-cases/list-sessions.use-case";
import { ListTrainingPlansUseCase } from "./application/use-cases/list-training-plans.use-case";
import { MoveSessionUseCase } from "./application/use-cases/move-session.use-case";
import { ReplaceSessionExercisesUseCase } from "./application/use-cases/replace-session-exercises.use-case";
import { SaveWeeklyTemplateUseCase } from "./application/use-cases/save-weekly-template.use-case";
import { UpdateMesocycleUseCase } from "./application/use-cases/update-mesocycle.use-case";
import { UpdateTrainingPlanUseCase } from "./application/use-cases/update-training-plan.use-case";
import { ValidateExerciseIds } from "./application/validate-exercise-ids.service";
import { SESSION_REPOSITORY } from "./domain/ports/session.repository.port";
import { TRAINING_PLAN_REPOSITORY } from "./domain/ports/training-plan.repository.port";
import { PrismaSessionRepository } from "./infrastructure/prisma-session.repository";
import { PrismaTrainingPlanRepository } from "./infrastructure/prisma-training-plan.repository";
import { MesocyclesController } from "./presentation/mesocycles.controller";
import { SessionsController } from "./presentation/sessions.controller";
import { TrainingPlansController } from "./presentation/training-plans.controller";

// PRD 06 — Training Plan Builder. Depends on AuthModule (guards, incl. the
// new PersonalTrainerGuard), RelationshipsModule (LINK_REPOSITORY — "own
// linked client" resolution, same as PRD 03/05), ExercisesModule
// (EXERCISE_REPOSITORY — the picker + each exercise's contraindicationTags
// for §5.6's cross-check) and IntakeModule (IntakeGatingService — §5.1's
// creation-time gate and §5.6's contraindications profile).
@Module({
  imports: [SharedModule, AuthModule, RelationshipsModule, ExercisesModule, IntakeModule],
  controllers: [TrainingPlansController, MesocyclesController, SessionsController],
  providers: [
    { provide: TRAINING_PLAN_REPOSITORY, useClass: PrismaTrainingPlanRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },

    TrainingPlanAccess,
    ContraindicationWarningService,
    SessionGenerationService,
    ClonePlanService,
    ValidateExerciseIds,

    CreateTrainingPlanUseCase,
    CreateStarterTemplateUseCase,
    GetTrainingPlanUseCase,
    ListTrainingPlansUseCase,
    UpdateTrainingPlanUseCase,
    ClonePlanUseCase,
    AssignStarterTemplateUseCase,
    CreateMesocycleUseCase,
    UpdateMesocycleUseCase,
    CloneMesocycleUseCase,
    SaveWeeklyTemplateUseCase,
    ListSessionsUseCase,
    GetSessionUseCase,
    MoveSessionUseCase,
    CancelSessionUseCase,
    ReplaceSessionExercisesUseCase,
  ],
  // Exported so PRD 07 (Client Training Execution — consumes generated
  // Sessions) and PRD 12 ("plan updated" trigger) can depend on this module.
  exports: [TRAINING_PLAN_REPOSITORY, SESSION_REPOSITORY],
})
export class TrainingPlansModule {}
