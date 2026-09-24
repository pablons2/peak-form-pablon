import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { ExerciseAccess } from "./application/exercise-access.service";
import { ExerciseInputValidator } from "./application/exercise-input-validator";
import { CreateCustomExerciseUseCase } from "./application/use-cases/create-custom-exercise.use-case";
import { CreateGlobalExerciseUseCase } from "./application/use-cases/create-global-exercise.use-case";
import { DeleteCustomExerciseUseCase } from "./application/use-cases/delete-custom-exercise.use-case";
import { DeleteExerciseAsAdminUseCase } from "./application/use-cases/delete-exercise-as-admin.use-case";
import { GetExerciseUseCase } from "./application/use-cases/get-exercise.use-case";
import { ImportExerciseCatalogUseCase } from "./application/use-cases/import-exercise-catalog.use-case";
import { ListContraindicationTagsUseCase } from "./application/use-cases/list-contraindication-tags.use-case";
import { PromoteExerciseUseCase } from "./application/use-cases/promote-exercise.use-case";
import { SearchExercisesUseCase } from "./application/use-cases/search-exercises.use-case";
import { UpdateCustomExerciseUseCase } from "./application/use-cases/update-custom-exercise.use-case";
import { UpdateExerciseAsAdminUseCase } from "./application/use-cases/update-exercise-as-admin.use-case";
import { CONTRAINDICATION_TAG_REPOSITORY } from "./domain/ports/contraindication-tag.repository.port";
import { EXERCISE_DATASET_SOURCE } from "./domain/ports/exercise-dataset-source.port";
import { EXERCISE_REPOSITORY } from "./domain/ports/exercise.repository.port";
import { MEDIA_STORE } from "./domain/ports/media-store.port";
import { JsonFileExerciseDataset } from "./infrastructure/json-file-exercise-dataset";
import { PrismaContraindicationTagRepository } from "./infrastructure/prisma-contraindication-tag.repository";
import { PrismaExerciseRepository } from "./infrastructure/prisma-exercise.repository";
import { S3MediaStore } from "./infrastructure/s3-media-store";
import { AdminExercisesController } from "./presentation/admin-exercises.controller";
import { ExercisesController } from "./presentation/exercises.controller";
import { SyncExerciseMediaService } from "./infrastructure/sync-exercise-media.service";

// PRD 05 — Exercise Library. Depends on AuthModule (guards) and
// RelationshipsModule (LINK_REPOSITORY — a Client's visible PRIVATE exercises
// are those owned by Professionals they have an ACTIVE link with, §5.3).
// EXERCISE_DATASET_SOURCE/MEDIA_STORE are the import job's adapters — faked
// at the port boundary in BDD (PRD 15 §5.2), S3/file-backed in production.
@Module({
  imports: [SharedModule, AuthModule, RelationshipsModule],
  controllers: [ExercisesController, AdminExercisesController],
  providers: [
    { provide: EXERCISE_REPOSITORY, useClass: PrismaExerciseRepository },
    {
      provide: CONTRAINDICATION_TAG_REPOSITORY,
      useClass: PrismaContraindicationTagRepository,
    },
    { provide: EXERCISE_DATASET_SOURCE, useClass: JsonFileExerciseDataset },
    { provide: MEDIA_STORE, useClass: S3MediaStore },

    ExerciseAccess,
    ExerciseInputValidator,
    SyncExerciseMediaService,

    SearchExercisesUseCase,
    GetExerciseUseCase,
    ListContraindicationTagsUseCase,
    CreateCustomExerciseUseCase,
    UpdateCustomExerciseUseCase,
    DeleteCustomExerciseUseCase,
    CreateGlobalExerciseUseCase,
    UpdateExerciseAsAdminUseCase,
    DeleteExerciseAsAdminUseCase,
    PromoteExerciseUseCase,
    ImportExerciseCatalogUseCase,
  ],
  // PRD 06's Training Plan Builder needs read access to the catalog (the
  // exercise picker) and each exercise's contraindicationTags (§5.6's
  // cross-check against a Client's intake profile) — same cross-module
  // export pattern as PRD 02's LINK_REPOSITORY / PRD 03's INTAKE_REPOSITORY.
  exports: [EXERCISE_REPOSITORY, CONTRAINDICATION_TAG_REPOSITORY],
})
export class ExercisesModule {}
