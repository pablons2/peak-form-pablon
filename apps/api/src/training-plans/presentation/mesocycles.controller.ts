import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  cloneMesocycleSchema,
  createMesocycleSchema,
  saveWeeklyTemplateSchema,
  updateMesocycleSchema,
  type CloneMesocycleInput,
  type CreateMesocycleInput,
  type SaveWeeklyTemplateInput,
  type UpdateMesocycleInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import { PersonalTrainerGuard } from "../../auth/presentation/guards/personal-trainer.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CloneMesocycleUseCase } from "../application/use-cases/clone-mesocycle.use-case";
import { CreateMesocycleUseCase } from "../application/use-cases/create-mesocycle.use-case";
import { ListSessionsUseCase } from "../application/use-cases/list-sessions.use-case";
import { SaveWeeklyTemplateUseCase } from "../application/use-cases/save-weekly-template.use-case";
import { UpdateMesocycleUseCase } from "../application/use-cases/update-mesocycle.use-case";
import { toPublicMesocycle, toPublicSession } from "./training-plan.serializer";

// Mesocycle rows have no @Controller prefix of their own (they nest under a
// plan for creation, stand alone for everything else), so this controller
// uses full path strings per route rather than a single class-level prefix.
// PRD 06 §5.2/§5.3/§5.4/§5.7 — mesocycle CRUD, the weekly-template
// save-and-generate endpoint, cloning, and (since it's the natural sibling
// listing) the mesocycle's generated sessions.
@Controller()
export class MesocyclesController {
  constructor(
    private readonly createMesocycle: CreateMesocycleUseCase,
    private readonly updateMesocycle: UpdateMesocycleUseCase,
    private readonly saveWeeklyTemplate: SaveWeeklyTemplateUseCase,
    private readonly cloneMesocycle: CloneMesocycleUseCase,
    private readonly listSessions: ListSessionsUseCase,
  ) {}

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @Post("training-plans/:planId/mesocycles")
  createHandler(
    @Param("planId") planId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createMesocycleSchema)) body: CreateMesocycleInput,
  ) {
    return this.createMesocycle
      .execute({ actor: user, planId, data: body })
      .then(toPublicMesocycle);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Patch("mesocycles/:id")
  updateHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateMesocycleSchema)) body: UpdateMesocycleInput,
  ) {
    return this.updateMesocycle
      .execute({ actor: user, mesocycleId: id, data: body })
      .then(toPublicMesocycle);
  }

  // §5.3/§5.4/§5.6 — replaces the whole weekly template and (re)generates
  // dated Sessions. Response includes any contraindication warnings the
  // save produced (§5.6 — persistent, not a disappearing toast).
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Post("mesocycles/:id/weekly-template")
  saveWeeklyTemplateHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(saveWeeklyTemplateSchema))
    body: SaveWeeklyTemplateInput,
  ) {
    return this.saveWeeklyTemplate
      .execute({ actor: user, mesocycleId: id, data: body })
      .then((result) => ({
        mesocycle: toPublicMesocycle(result.mesocycle),
        warnings: result.warnings,
      }));
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(201)
  @Post("mesocycles/:id/clone")
  cloneHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(cloneMesocycleSchema)) body: CloneMesocycleInput,
  ) {
    return this.cloneMesocycle
      .execute({ actor: user, sourceMesocycleId: id, targetPlanId: body.targetPlanId })
      .then(toPublicMesocycle);
  }

  @Get("mesocycles/:id/sessions")
  listSessionsHandler(@Param("id") id: string, @CurrentUser() user: UserWithProfiles) {
    return this.listSessions
      .execute({ viewer: user, mesocycleId: id })
      .then((sessions) => sessions.map(toPublicSession));
  }
}
