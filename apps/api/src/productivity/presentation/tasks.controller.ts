import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@peakform/validation";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ApprovalStatusGuard } from "../../auth/presentation/guards/approval-status.guard";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { CreateTaskUseCase } from "../application/use-cases/create-task.use-case";
import { DeleteTaskUseCase } from "../application/use-cases/delete-task.use-case";
import { ListMyTasksUseCase } from "../application/use-cases/list-my-tasks.use-case";
import { UpdateTaskUseCase } from "../application/use-cases/update-task.use-case";
import { toPublicTask } from "./productivity.serializer";

// PRD 10 §4/§5.3 — Client-only flat personal task list, own-data-only. Same
// "no route param carries another user's id" structural scoping as
// HabitsController.
@Controller("tasks")
export class TasksController {
  constructor(
    private readonly createTask: CreateTaskUseCase,
    private readonly listMyTasks: ListMyTasksUseCase,
    private readonly updateTask: UpdateTaskUseCase,
    private readonly deleteTask: DeleteTaskUseCase,
  ) {}

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(201)
  @Post()
  async createHandler(
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
  ) {
    const task = await this.createTask.execute({ clientId: user.id, data: body });
    return toPublicTask(task);
  }

  // Pending tasks first, each group oldest-first (see the repository's
  // listTasksForClient comment for the exact ordering rule).
  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Get()
  async listHandler(@CurrentUser() user: UserWithProfiles) {
    const tasks = await this.listMyTasks.execute({ clientId: user.id });
    return tasks.map(toPublicTask);
  }

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @Patch(":id")
  async updateHandler(
    @Param("id") id: string,
    @CurrentUser() user: UserWithProfiles,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
  ) {
    const task = await this.updateTask.execute({
      clientId: user.id,
      taskId: id,
      data: body,
    });
    return toPublicTask(task);
  }

  @Roles(Role.CLIENT)
  @UseGuards(ApprovalStatusGuard)
  @HttpCode(200)
  @Delete(":id")
  async deleteHandler(@Param("id") id: string, @CurrentUser() user: UserWithProfiles) {
    await this.deleteTask.execute({ clientId: user.id, taskId: id });
    return { ok: true };
  }
}
