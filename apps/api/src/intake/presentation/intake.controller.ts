import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  addProfessionalAnnotationSchema,
  skipIntakeSchema,
  updateIntakeSchema,
  type AddProfessionalAnnotationInput,
  type SkipIntakeInput,
  type UpdateIntakeInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { AddProfessionalAnnotationUseCase } from "../application/use-cases/add-professional-annotation.use-case";
import { CompleteIntakeUseCase } from "../application/use-cases/complete-intake.use-case";
import { GetClientIntakeUseCase } from "../application/use-cases/get-client-intake.use-case";
import { GetMyIntakeUseCase } from "../application/use-cases/get-my-intake.use-case";
import { ListClientIntakeVersionsUseCase } from "../application/use-cases/list-client-intake-versions.use-case";
import { SkipIntakeUseCase } from "../application/use-cases/skip-intake.use-case";
import { StartOrResumeIntakeUseCase } from "../application/use-cases/start-or-resume-intake.use-case";
import { UpdateIntakeUseCase } from "../application/use-cases/update-intake.use-case";
import {
  toPublicIntakeForClient,
  toPublicIntakeForProfessional,
} from "./intake.serializer";

// PRD 03 §4/§5 — the intake/anamnesis flow. Client-only for authoring own
// data; Professional-only (own linked clients) for review + annotation. No
// Admin access at all — see IntakeAccess for why.
@Controller("intake")
export class IntakeController {
  constructor(
    private readonly startOrResume: StartOrResumeIntakeUseCase,
    private readonly updateIntake: UpdateIntakeUseCase,
    private readonly completeIntake: CompleteIntakeUseCase,
    private readonly skipIntake: SkipIntakeUseCase,
    private readonly getMine: GetMyIntakeUseCase,
    private readonly getClientIntake: GetClientIntakeUseCase,
    private readonly listClientVersions: ListClientIntakeVersionsUseCase,
    private readonly addAnnotation: AddProfessionalAnnotationUseCase,
  ) {}

  // §5.1 — opens the questionnaire: resumes the current draft or starts a
  // new version.
  @Roles(Role.CLIENT)
  @Post()
  startHandler(@CurrentUser() user: UserWithProfiles) {
    return this.startOrResume
      .execute({ clientId: user.id })
      .then(toPublicIntakeForClient);
  }

  // §4 — the Client's own latest intake (any status) + the plan-assignment
  // gating flag.
  @Roles(Role.CLIENT)
  @Get("mine")
  async getMineHandler(@CurrentUser() user: UserWithProfiles) {
    const { intake, planAssignmentAllowed } = await this.getMine.execute({
      clientId: user.id,
    });
    return {
      intake: intake ? toPublicIntakeForClient(intake) : null,
      planAssignmentAllowed,
    };
  }

  // §5.1 — step-by-step autosave while the draft is IN_PROGRESS.
  @Roles(Role.CLIENT)
  @HttpCode(200)
  @Patch(":id")
  updateHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateIntakeSchema)) body: UpdateIntakeInput,
  ) {
    return this.updateIntake
      .execute({ clientId: user.id, intakeAssessmentId: id, data: body })
      .then(toPublicIntakeForClient);
  }

  // §5.1/§5.2 — finalize: requires every readiness question answered,
  // derives the contraindications profile.
  @Roles(Role.CLIENT)
  @HttpCode(200)
  @Post(":id/complete")
  completeHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.completeIntake
      .execute({ clientId: user.id, intakeAssessmentId: id })
      .then(toPublicIntakeForClient);
  }

  // §5.3 — skip with the risk disclaimer acknowledged.
  @Roles(Role.CLIENT)
  @HttpCode(200)
  @Post(":id/skip")
  skipHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(skipIntakeSchema)) _body: SkipIntakeInput,
  ) {
    return this.skipIntake
      .execute({ clientId: user.id, intakeAssessmentId: id })
      .then(toPublicIntakeForClient);
  }

  // §5.4 — Professional's review of a linked Client's latest finalized
  // intake.
  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @Get("clients/:clientId")
  async getClientHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    const { intake, planAssignmentAllowed } = await this.getClientIntake.execute({
      professionalId: user.id,
      clientId,
    });
    return {
      intake: intake ? toPublicIntakeForProfessional(intake) : null,
      planAssignmentAllowed,
    };
  }

  // §5.3 — version history for the review screen.
  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @Get("clients/:clientId/versions")
  listClientVersionsHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.listClientVersions
      .execute({ professionalId: user.id, clientId })
      .then((versions) => versions.map(toPublicIntakeForProfessional));
  }

  // §5.4 — clinical annotation on one specific intake version.
  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post(":intakeAssessmentId/annotations")
  addAnnotationHandler(
    @Param("intakeAssessmentId") intakeAssessmentId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(addProfessionalAnnotationSchema))
    body: AddProfessionalAnnotationInput,
  ) {
    return this.addAnnotation.execute({
      professionalId: user.id,
      intakeAssessmentId,
      note: body.note,
    });
  }
}
