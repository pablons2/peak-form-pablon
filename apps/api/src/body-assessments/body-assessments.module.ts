import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { RelationshipsModule } from "../relationships/relationships.module";
import { BodyAssessmentAccess } from "./application/body-assessment-access.service";
import { CreateFormalAssessmentUseCase } from "./application/use-cases/create-formal-assessment.use-case";
import { CreateSelfLogUseCase } from "./application/use-cases/create-self-log.use-case";
import { ListClientBodyAssessmentsUseCase } from "./application/use-cases/list-client-body-assessments.use-case";
import { ListMyBodyAssessmentsUseCase } from "./application/use-cases/list-my-body-assessments.use-case";
import { RequestPhotoUploadUrlUseCase } from "./application/use-cases/request-photo-upload-url.use-case";
import { BODY_ASSESSMENT_REPOSITORY } from "./domain/ports/body-assessment.repository.port";
import { SIGNED_MEDIA_STORE } from "./domain/ports/signed-media-store.port";
import { PrismaBodyAssessmentRepository } from "./infrastructure/prisma-body-assessment.repository";
import { S3SignedMediaStore } from "./infrastructure/s3-signed-media-store";
import { BodyAssessmentsController } from "./presentation/body-assessments.controller";

// PRD 04 — Body Assessment. Depends on AuthModule (guards + USER_REPOSITORY,
// needed to read a Client's dateOfBirth/biologicalSex for the Jackson &
// Pollock calculation) and RelationshipsModule (LINK_REPOSITORY — the same
// "ACTIVE link, any specialization" pattern PRD 03's IntakeAccess and PRD
// 05's ExerciseAccess use).
@Module({
  imports: [SharedModule, AuthModule, RelationshipsModule],
  controllers: [BodyAssessmentsController],
  providers: [
    { provide: BODY_ASSESSMENT_REPOSITORY, useClass: PrismaBodyAssessmentRepository },
    { provide: SIGNED_MEDIA_STORE, useClass: S3SignedMediaStore },

    BodyAssessmentAccess,

    CreateSelfLogUseCase,
    CreateFormalAssessmentUseCase,
    ListMyBodyAssessmentsUseCase,
    ListClientBodyAssessmentsUseCase,
    RequestPhotoUploadUrlUseCase,
  ],
  // Exported so PRD 08 (Nutrition Module — §5.1's Mifflin-St Jeor draft
  // reads the Client's most recent weight/height) can depend on this
  // module, the same cross-module "the owning module extends and exports
  // its own port" pattern IntakeModule/TrainingPlansModule established.
  exports: [BODY_ASSESSMENT_REPOSITORY],
})
export class BodyAssessmentsModule {}
