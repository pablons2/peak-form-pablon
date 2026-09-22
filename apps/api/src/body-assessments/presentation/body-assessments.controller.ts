import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  createFormalAssessmentSchema,
  createSelfLogSchema,
  requestPhotoUploadUrlSchema,
  type CreateFormalAssessmentInput,
  type CreateSelfLogInput,
  type RequestPhotoUploadUrlInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import {
  SIGNED_MEDIA_STORE,
  type SignedMediaStore,
} from "../domain/ports/signed-media-store.port";
import { CreateFormalAssessmentUseCase } from "../application/use-cases/create-formal-assessment.use-case";
import { CreateSelfLogUseCase } from "../application/use-cases/create-self-log.use-case";
import { ListClientBodyAssessmentsUseCase } from "../application/use-cases/list-client-body-assessments.use-case";
import { ListMyBodyAssessmentsUseCase } from "../application/use-cases/list-my-body-assessments.use-case";
import { RequestPhotoUploadUrlUseCase } from "../application/use-cases/request-photo-upload-url.use-case";
import {
  toPublicBodyAssessment,
  toPublicBodyAssessments,
} from "./body-assessment.serializer";

// PRD 04 §4/§5 — Client self-log + own history; Professional (own linked
// clients) + Admin formal-assessment authoring; append-only throughout (no
// PATCH/PUT/DELETE route exists anywhere on this controller — corrections
// are new entries, §5.4).
@Controller("body-assessments")
export class BodyAssessmentsController {
  constructor(
    private readonly createSelfLog: CreateSelfLogUseCase,
    private readonly createFormal: CreateFormalAssessmentUseCase,
    private readonly listMine: ListMyBodyAssessmentsUseCase,
    private readonly listForClient: ListClientBodyAssessmentsUseCase,
    private readonly requestUploadUrl: RequestPhotoUploadUrlUseCase,
    @Inject(SIGNED_MEDIA_STORE) private readonly mediaStore: SignedMediaStore,
  ) {}

  // §5.1 — Client-only quick self-log.
  @Roles(Role.CLIENT)
  @HttpCode(201)
  @Post("self-log")
  async selfLogHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createSelfLogSchema)) body: CreateSelfLogInput,
  ) {
    const created = await this.createSelfLog.execute({
      clientId: user.id,
      data: body,
    });
    return toPublicBodyAssessment(created, this.mediaStore);
  }

  // §4 — the Client's own full append-only timeline.
  @Roles(Role.CLIENT)
  @Get("mine")
  async listMineHandler(@CurrentUser() user: UserWithProfiles) {
    const entries = await this.listMine.execute({ clientId: user.id });
    return toPublicBodyAssessments(entries, this.mediaStore);
  }

  // §5.2/§4 — Professional's (own linked Client) or Admin's formal
  // assessment. Computed BMI/WHR/%BF happen server-side in the use-case.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post("clients/:clientId/formal")
  async createFormalHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createFormalAssessmentSchema))
    body: CreateFormalAssessmentInput,
  ) {
    const created = await this.createFormal.execute({
      actor: { id: user.id, role: user.role },
      clientId,
      data: body,
    });
    return toPublicBodyAssessment(created, this.mediaStore);
  }

  // §4 — a Professional's view of one linked Client's timeline.
  @Roles(Role.PROFESSIONAL)
  @UseGuards(ApprovalStatusGuard)
  @Get("clients/:clientId")
  async listForClientHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    const entries = await this.listForClient.execute({
      professionalId: user.id,
      clientId,
    });
    return toPublicBodyAssessments(entries, this.mediaStore);
  }

  // §5.7 step 1 — presigned upload URL + object key, shared by the
  // self-log and formal-assessment flows.
  @Roles(Role.CLIENT, Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post("clients/:clientId/photo-upload-url")
  requestUploadUrlHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(requestPhotoUploadUrlSchema))
    body: RequestPhotoUploadUrlInput,
  ) {
    return this.requestUploadUrl.execute({
      actor: { id: user.id, role: user.role },
      clientId,
      data: body,
    });
  }
}
