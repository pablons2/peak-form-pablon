import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  moveSessionSchema,
  replaceSessionExercisesSchema,
  type MoveSessionInput,
  type ReplaceSessionExercisesInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import { PersonalTrainerGuard } from "../../auth/presentation/guards/personal-trainer.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CancelSessionUseCase } from "../application/use-cases/cancel-session.use-case";
import { GetSessionUseCase } from "../application/use-cases/get-session.use-case";
import { MoveSessionUseCase } from "../application/use-cases/move-session.use-case";
import { ReplaceSessionExercisesUseCase } from "../application/use-cases/replace-session-exercises.use-case";
import { toPublicSession } from "./training-plan.serializer";

// PRD 06 §5.4/§5.6 — acting on one dated Session instance without touching
// the underlying template or any other generated session. Client access is
// read-only (GET only) per §4.
@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly getSession: GetSessionUseCase,
    private readonly moveSession: MoveSessionUseCase,
    private readonly cancelSession: CancelSessionUseCase,
    private readonly replaceExercises: ReplaceSessionExercisesUseCase,
  ) {}

  @Get(":id")
  getHandler(@Param("id") id: string, @CurrentUser() user: UserWithProfiles) {
    return this.getSession
      .execute({ viewer: user, sessionId: id })
      .then(toPublicSession);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Post(":id/move")
  moveHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(moveSessionSchema)) body: MoveSessionInput,
  ) {
    return this.moveSession
      .execute({ actor: user, sessionId: id, date: body.date })
      .then(toPublicSession);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Post(":id/cancel")
  cancelHandler(@Param("id") id: string, @CurrentUser() user: UserWithProfiles) {
    return this.cancelSession
      .execute({ actor: user, sessionId: id })
      .then(toPublicSession);
  }

  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(PersonalTrainerGuard, ApprovalStatusGuard)
  @HttpCode(200)
  @Patch(":id/exercises")
  replaceExercisesHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(replaceSessionExercisesSchema))
    body: ReplaceSessionExercisesInput,
  ) {
    return this.replaceExercises
      .execute({ actor: user, sessionId: id, data: body })
      .then((result) => ({
        session: toPublicSession(result.session),
        warnings: result.warnings,
      }));
  }
}
