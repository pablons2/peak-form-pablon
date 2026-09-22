import { Inject, Injectable } from "@nestjs/common";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";
import { ProductivityAccess } from "../productivity-access.service";

// PRD 10 §6 — hard delete; a finished/deleted task carries no history
// worth preserving (unlike a habit's check-in trail, which is append-only).
@Injectable()
export class DeleteTaskUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async execute(input: { clientId: string; taskId: string }): Promise<void> {
    const task = await this.productivity.findTaskById(input.taskId, input.clientId);
    this.access.assertOwns(task, "Task not found");

    await this.productivity.deleteTask(input.taskId);
  }
}
