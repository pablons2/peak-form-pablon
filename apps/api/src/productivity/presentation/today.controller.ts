import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { GetTodayUseCase } from "../application/use-cases/get-today.use-case";
import { toPublicHabit, toPublicTask } from "./productivity.serializer";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// PRD 10 §5.4 — feeds PRD 09's "Today" checklist card: every habit due
// today (each carrying its `checkedToday` state — see GetTodayUseCase's
// comment for why it's a flag, not a filter) + today's due (incl.
// overdue) tasks. Client-only, own-data-only, same as the other two
// controllers in this module.
@Controller("productivity")
export class TodayController {
  constructor(private readonly getToday: GetTodayUseCase) {}

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Get("today")
  async todayHandler(@CurrentUser() user: UserWithProfiles) {
    const today = todayIso();
    const { habits, tasks } = await this.getToday.execute({ clientId: user.id, today });
    return {
      habits: habits.map((h) => toPublicHabit(h, today)),
      tasks: tasks.map(toPublicTask),
    };
  }
}
