import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth.module";
import { ProductivityAccess } from "./application/productivity-access.service";
import { CheckInHabitUseCase } from "./application/use-cases/check-in-habit.use-case";
import { CreateHabitUseCase } from "./application/use-cases/create-habit.use-case";
import { CreateTaskUseCase } from "./application/use-cases/create-task.use-case";
import { DeleteCheckInUseCase } from "./application/use-cases/delete-check-in.use-case";
import { DeleteTaskUseCase } from "./application/use-cases/delete-task.use-case";
import { GetTodayUseCase } from "./application/use-cases/get-today.use-case";
import { ListMyHabitsUseCase } from "./application/use-cases/list-my-habits.use-case";
import { ListMyTasksUseCase } from "./application/use-cases/list-my-tasks.use-case";
import { UpdateHabitUseCase } from "./application/use-cases/update-habit.use-case";
import { UpdateTaskUseCase } from "./application/use-cases/update-task.use-case";
import { PRODUCTIVITY_REPOSITORY } from "./domain/ports/productivity.repository.port";
import { PrismaProductivityRepository } from "./infrastructure/prisma-productivity.repository";
import { HabitsController } from "./presentation/habits.controller";
import { TasksController } from "./presentation/tasks.controller";
import { TodayController } from "./presentation/today.controller";

// PRD 10 — Productivity/Habits. Client-only, own-data-only (§4): no
// RelationshipsModule import — there's no "own linked client" concept
// here at all, unlike NutritionModule/MessagingModule. Only AuthModule
// (guards, CurrentUser, ApprovalStatusGuard's no-op-for-Client pass-
// through) is needed.
@Module({
  imports: [SharedModule, AuthModule],
  controllers: [HabitsController, TasksController, TodayController],
  providers: [
    { provide: PRODUCTIVITY_REPOSITORY, useClass: PrismaProductivityRepository },

    ProductivityAccess,

    CreateHabitUseCase,
    ListMyHabitsUseCase,
    UpdateHabitUseCase,
    CheckInHabitUseCase,
    DeleteCheckInUseCase,

    CreateTaskUseCase,
    ListMyTasksUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,

    GetTodayUseCase,
  ],
  // Exported so PRD 09's DashboardModule can drop this exact use-case into
  // its own "Today" composition (built self-contained specifically for
  // this, per this file's own get-today.use-case.ts comment).
  exports: [GetTodayUseCase],
})
export class ProductivityModule {}
