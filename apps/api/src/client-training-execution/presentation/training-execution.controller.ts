import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { logSetSchema, type LogSetInput } from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CompleteSessionUseCase } from "../application/use-cases/complete-session.use-case";
import { GetTodaySessionUseCase } from "../application/use-cases/get-today-session.use-case";
import { ListClientSessionsUseCase } from "../application/use-cases/list-client-sessions.use-case";
import { ListMySessionsUseCase } from "../application/use-cases/list-my-sessions.use-case";
import { LogSetUseCase } from "../application/use-cases/log-set.use-case";
import { toPublicSessionExecution } from "./training-execution.serializer";

// PRD 07 §4 — Client-only for viewing/logging/completing own sessions
// (self `clientId`/`actor` always from the JWT, never trusted from a route
// param); Professional/Admin get exactly one, read-only, GET route — there
// is deliberately no mutating route either role could even attempt to hit
// (§5.2/§5.3's "Professional ❌" row, taken literally the same way Phase 8/9
// took their own permission tables literally).
@Controller("training-execution")
export class TrainingExecutionController {
  constructor(
    private readonly getToday: GetTodaySessionUseCase,
    private readonly listMine: ListMySessionsUseCase,
    private readonly logSet: LogSetUseCase,
    private readonly completeSession: CompleteSessionUseCase,
    private readonly listClientSessions: ListClientSessionsUseCase,
  ) {}

  // §5.1 — today's session or a rest-day state.
  @Roles(Role.CLIENT)
  @Get("today")
  async todayHandler(@CurrentUser() user: UserWithProfiles) {
    const { session, isRestDay } = await this.getToday.execute({
      clientId: user.id,
      now: new Date(),
    });
    return { session: session ? toPublicSessionExecution(session) : null, isRestDay };
  }

  // §5.1/§5.4 — the Client's own full history.
  @Roles(Role.CLIENT)
  @Get("sessions")
  listMineHandler(@CurrentUser() user: UserWithProfiles) {
    return this.listMine
      .execute({ clientId: user.id })
      .then((sessions) => sessions.map(toPublicSessionExecution));
  }

  // §5.2/§5.3/§5.4 — log one set; may auto-complete the session.
  @Roles(Role.CLIENT)
  @HttpCode(201)
  @Post("sessions/:sessionId/exercises/:sessionExerciseId/logs")
  logSetHandler(
    @Param("sessionId") sessionId: string,
    @Param("sessionExerciseId") sessionExerciseId: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(logSetSchema)) body: LogSetInput,
  ) {
    return this.logSet
      .execute({ actor: user, sessionId, sessionExerciseId, data: body })
      .then(toPublicSessionExecution);
  }

  // §5.3 — manual completion; never fabricates missing set data.
  @Roles(Role.CLIENT)
  @HttpCode(200)
  @Post("sessions/:sessionId/complete")
  completeHandler(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.completeSession
      .execute({ actor: user, sessionId })
      .then(toPublicSessionExecution);
  }

  // §4 — Professional (own linked Client, PERSONAL_TRAINER) or Admin (any
  // Client), read-only.
  @Roles(Role.PROFESSIONAL, Role.ADMIN)
  @UseGuards(ApprovalStatusGuard)
  @Get("clients/:clientId/sessions")
  listClientSessionsHandler(
    @Param("clientId") clientId: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    return this.listClientSessions
      .execute({ actor: user, clientId })
      .then((sessions) => sessions.map(toPublicSessionExecution));
  }
}
