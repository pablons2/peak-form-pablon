import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  checkInHabitSchema,
  createHabitSchema,
  updateHabitSchema,
  type CheckInHabitInput,
  type CreateHabitInput,
  type UpdateHabitInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CheckInHabitUseCase } from "../application/use-cases/check-in-habit.use-case";
import { CreateHabitUseCase } from "../application/use-cases/create-habit.use-case";
import { DeleteCheckInUseCase } from "../application/use-cases/delete-check-in.use-case";
import { ListMyHabitsUseCase } from "../application/use-cases/list-my-habits.use-case";
import { UpdateHabitUseCase } from "../application/use-cases/update-habit.use-case";
import { toPublicCheckIn, toPublicHabit } from "./productivity.serializer";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// PRD 10 §4 — Client-only, own-data-only. There is deliberately no route
// param carrying another user's id anywhere on this controller (unlike
// nutrition's /clients/:clientId/* Professional-facing routes) — the
// caller's own id from the JWT is the only id ever used to scope a query,
// and @Roles(Role.CLIENT) is the entire enforcement for "no Professional/
// Admin visibility at all" (§4's table has no ✅ for either role on any
// row here, so RolesGuard's 403 already satisfies the whole requirement).
@Controller("habits")
export class HabitsController {
  constructor(
    private readonly createHabit: CreateHabitUseCase,
    private readonly listMyHabits: ListMyHabitsUseCase,
    private readonly updateHabit: UpdateHabitUseCase,
    private readonly checkInHabit: CheckInHabitUseCase,
    private readonly deleteCheckIn: DeleteCheckInUseCase,
  ) {}

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post()
  async createHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createHabitSchema)) body: CreateHabitInput,
  ) {
    const habit = await this.createHabit.execute({ clientId: user.id, data: body });
    return toPublicHabit({ ...habit, checkIns: [] }, todayIso());
  }

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Get()
  async listHandler(@CurrentUser() user: UserWithProfiles) {
    const habits = await this.listMyHabits.execute({ clientId: user.id });
    const today = todayIso();
    return habits.map((h) => toPublicHabit(h, today));
  }

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Patch(":id")
  async updateHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateHabitSchema)) body: UpdateHabitInput,
  ) {
    const habit = await this.updateHabit.execute({
      clientId: user.id,
      habitId: id,
      data: body,
    });
    return toPublicHabit(habit, todayIso());
  }

  // §5.2 — checks the habit off for body.date (defaults to today). 404 on a
  // non-own or archived habit (see CheckInHabitUseCase's comment on why
  // archived habits reject with 404, not 403).
  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post(":id/check-ins")
  async checkInHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(checkInHabitSchema)) body: CheckInHabitInput,
  ) {
    const checkIn = await this.checkInHabit.execute({
      clientId: user.id,
      habitId: id,
      date: body.date ?? todayIso(),
    });
    return toPublicCheckIn(checkIn);
  }

  // §5.2 — misclick recovery: undo a check-in for a given date.
  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(200)
  @Delete(":id/check-ins/:date")
  async deleteCheckInHandler(
    @Param("id") id: string,
    @Param("date") date: string,
    @CurrentUser() user: UserWithProfiles,
  ) {
    await this.deleteCheckIn.execute({ clientId: user.id, habitId: id, date });
    return { ok: true };
  }
}
