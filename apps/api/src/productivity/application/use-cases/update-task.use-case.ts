import { Inject, Injectable } from "@nestjs/common";
import type { PersonalTask } from "@prisma/client";
import type { UpdateTaskInput } from "@peakform/validation";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";
import { ProductivityAccess } from "../productivity-access.service";

// PRD 10 §5.3 — edit text/dueDate/done. `done: true` stamps completedAt
// (server clock, never client-supplied); `done: false` clears it.
@Injectable()
export class UpdateTaskUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async execute(input: {
    clientId: string;
    taskId: string;
    data: UpdateTaskInput;
  }): Promise<PersonalTask> {
    const task = await this.productivity.findTaskById(input.taskId, input.clientId);
    this.access.assertOwns(task, "Task not found");

    const { done, ...rest } = input.data;
    return this.productivity.updateTask(input.taskId, {
      ...rest,
      ...(done === true ? { done: true, completedAt: new Date() } : {}),
      ...(done === false ? { done: false, completedAt: null } : {}),
    });
  }
}
