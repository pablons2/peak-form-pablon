import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { GetTodayDashboardUseCase } from "../application/use-cases/get-today-dashboard.use-case";
import { GetWeekDashboardUseCase } from "../application/use-cases/get-week-dashboard.use-case";
import { toPublicSessionExecution } from "../../client-training-execution/presentation/training-execution.serializer";
import {
  toPublicFoodDiaryEntry,
  toPublicNutritionPlan,
} from "../../nutrition/presentation/nutrition.serializer";
import { toPublicHabit, toPublicTask } from "../../productivity/presentation/productivity.serializer";
import { toPublicThread } from "../../messaging/presentation/messaging.serializer";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// PRD 09 — the Client's default landing screen. Client-only (§4); every
// response reshapes its constituent modules' own public shapes via each
// module's own serializer, never a second copy of that logic.
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly getToday: GetTodayDashboardUseCase,
    private readonly getWeek: GetWeekDashboardUseCase,
  ) {}

  // §5.1
  @Roles(Role.CLIENT)
  @Get("today")
  async todayHandler(@CurrentUser() user: UserWithProfiles) {
    const result = await this.getToday.execute({ clientId: user.id, now: new Date() });
    const today = todayIso();
    return {
      training: {
        session: result.training.session
          ? toPublicSessionExecution(result.training.session)
          : null,
        isRestDay: result.training.isRestDay,
      },
      nutrition: {
        entries: result.nutrition.entries.map(toPublicFoodDiaryEntry),
        totals: result.nutrition.totals,
        activeTarget: result.nutrition.activeTarget
          ? toPublicNutritionPlan(result.nutrition.activeTarget)
          : null,
        nudges: result.nutrition.nudges,
      },
      habits: result.habits.map((h) => toPublicHabit(h, today)),
      tasks: result.tasks.map(toPublicTask),
      messages: {
        unreadTotal: result.messages.unreadTotal,
        unreadThreads: result.messages.unreadThreads.map((t) => ({
          ...toPublicThread(t.thread),
          unreadCount: t.unreadCount,
        })),
      },
      checkInDue: result.checkInDue,
    };
  }

  // §5.2
  @Roles(Role.CLIENT)
  @Get("week")
  async weekHandler(@CurrentUser() user: UserWithProfiles) {
    return this.getWeek.execute({ clientId: user.id, now: new Date() });
  }
}
