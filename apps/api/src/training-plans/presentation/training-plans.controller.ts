import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  clonePlanSchema,
  createStarterTemplateSchema,
  createTrainingPlanSchema,
  updateTrainingPlanSchema,
  type ClonePlanInput,
  type CreateStarterTemplateInput,
  type CreateTrainingPlanInput,
  type UpdateTrainingPlanInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import { PersonalTrainerGuard } from "../../auth/presentation/guards/personal-trainer.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { AssignStarterTemplateUseCase } from "../application/use-cases/assign-starter-template.use-case";
import { ClonePlanUseCase } from "../application/use-cases/clone-plan.use-case";
import { CreateStarterTemplateUseCase } from "../application/use-cases/create-starter-template.use-case";
import { CreateTrainingPlanUseCase } from "../application/use-cases/create-training-plan.use-case";
import { GetTrainingPlanUseCase } from "../application/use-cases/get-training-plan.use-case";
import { ListTrainingPlansUseCase } from "../application/use-cases/list-training-plans.use-case";
import { UpdateTrainingPlanUseCase } from "../application/use-cases/update-training-plan.use-case";
import { toPublicTrainingPlan } from "./training-plan.serializer";

// PRD 06 §4/§5.1/§5.7/§5.8 — the plan root: create/edit/clone for
// Professionals (PERSONAL_TRAINER only, own clients) and Admin, read-only
// for the owning Client, plus the Starter Template browse/self-assign path.
// Literal routes ("mine", "starter-templates") are declared before the
// generic ":id" routes so they aren't shadowed by it (same convention as
// PRD 05's ExercisesController).
@Controller("training-plans")
export class TrainingPlansController {
  constructor(
    private readonly createPlan: CreateTrainingPlanUseCase,
    private readonly createStarterTemplate: CreateStarterTemplateUseCase,
    private readonly getPlan: GetTrainingPlanUseCase,
    private readonly listPlans: ListTrainingPlansUseCase,
    private readonly updatePlan: UpdateTrainingPlanUseCase,
    private readonly clonePlan: ClonePlanUseCase,
    private readonly assignStarterTemplate: AssignStarterTemplateUseCase,
  ) {}

  // §5.8 — browsable by any authenticated role.
  @Get("starter-templates")
  listStarterTemplatesHandler() {
    return this.listPlans
      .listStarterTemplates()
      .then((plans) => plans.map(toPublicTrainingPlan));
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @Post("starter-templates")
  createStarterTemplateHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createStarterTemplateSchema))
    body: CreateStarterTemplateInput,
  ) {
    return this.createStarterTemplate
      .execute({ actor: user, name: body.name, startDate: body.startDate })
      .then(toPublicTrainingPlan);
  }

  // §5.8 — Client self-assign, only without an active Personal Trainer.
  @Roles(Role.CLIENT)
  @HttpCode(200)
  @Post("starter-templates/:id/assign")
  assignStarterTemplateHandler(
    @Param("id") templateId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.assignStarterTemplate
      .execute({ client: user, templateId })
      .then((plan) => toPublicTrainingPlan(plan!));
  }

  @Roles(Role.CLIENT)
  @Get("mine")
  listMineHandler(@CurrentUser() user: UserWithProfiles) {
    return this.listPlans
      .listMine(user.id)
      .then((plans) => plans.map(toPublicTrainingPlan));
  }

  // §7 — a Professional's/Admin's view of one Client's plans.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @Get()
  listForClientHandler(
    @CurrentUser() user: UserWithProfiles,
    @Query("clientId") clientId: string,
  ) {
    return this.listPlans
      .listForClient(user, clientId)
      .then((plans) => plans.map(toPublicTrainingPlan));
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @Post()
  createHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createTrainingPlanSchema))
    body: CreateTrainingPlanInput,
  ) {
    return this.createPlan
      .execute({
        actor: user,
        clientId: body.clientId,
        professionalId: body.professionalId,
        name: body.name,
        startDate: body.startDate,
      })
      .then(toPublicTrainingPlan);
  }

  @Get(":id")
  getHandler(@Param("id") id: string, @CurrentUser() user: UserWithProfiles) {
    return this.getPlan
      .execute({ viewer: user, planId: id })
      .then(toPublicTrainingPlan);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Patch(":id")
  updateHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateTrainingPlanSchema))
    body: UpdateTrainingPlanInput,
  ) {
    return this.updatePlan
      .execute({ actor: user, planId: id, data: body })
      .then(toPublicTrainingPlan);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(201)
  @Post(":id/clone")
  cloneHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(clonePlanSchema)) body: ClonePlanInput,
  ) {
    return this.clonePlan
      .execute({
        actor: user,
        sourcePlanId: id,
        targetClientId: body.targetClientId,
        professionalId: body.professionalId,
        name: body.name,
        startDate: body.startDate,
      })
      .then((plan) => toPublicTrainingPlan(plan!));
  }
}
