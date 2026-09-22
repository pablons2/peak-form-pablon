import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { TrainingPlansModule } from "../training-plans/training-plans.module";
import { SessionExecutionComposer } from "./application/session-execution-composer.service";
import { TrainingExecutionAccess } from "./application/training-execution-access.service";
import { CompleteSessionUseCase } from "./application/use-cases/complete-session.use-case";
import { GetTodaySessionUseCase } from "./application/use-cases/get-today-session.use-case";
import { ListClientSessionsUseCase } from "./application/use-cases/list-client-sessions.use-case";
import { ListMySessionsUseCase } from "./application/use-cases/list-my-sessions.use-case";
import { LogSetUseCase } from "./application/use-cases/log-set.use-case";
import { RunMissedSessionJobUseCase } from "./application/use-cases/run-missed-session-job.use-case";
import { EXERCISE_LOG_REPOSITORY } from "./domain/ports/exercise-log.repository.port";
import { MissedSessionJobService } from "./infrastructure/missed-session-job.service";
import { PrismaExerciseLogRepository } from "./infrastructure/prisma-exercise-log.repository";
import { TrainingExecutionController } from "./presentation/training-execution.controller";

// PRD 07 — Client Training Execution. Depends on AuthModule (guards),
// RelationshipsModule (LINK_REPOSITORY — TrainingExecutionAccess's
// Professional-side check) and TrainingPlansModule (SESSION_REPOSITORY,
// extended this phase with the clientId-aware queries PRD 07 needs, plus
// TrainingPlanAccess for the Client-self ownership walk — see that module's
// Phase 9 export note).
@Module({
  imports: [SharedModule, AuthModule, RelationshipsModule, TrainingPlansModule],
  controllers: [TrainingExecutionController],
  providers: [
    { provide: EXERCISE_LOG_REPOSITORY, useClass: PrismaExerciseLogRepository },

    SessionExecutionComposer,
    TrainingExecutionAccess,

    GetTodaySessionUseCase,
    ListMySessionsUseCase,
    LogSetUseCase,
    CompleteSessionUseCase,
    ListClientSessionsUseCase,
    RunMissedSessionJobUseCase,
    MissedSessionJobService,
  ],
})
export class ClientTrainingExecutionModule {}
