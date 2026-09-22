import { Inject, Injectable } from "@nestjs/common";
import type { PersonalTask } from "@prisma/client";
import type { CreateTaskInput } from "@peakform/validation";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";

// PRD 10 §5.3 — flat personal task: text + optional due date.
@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
  ) {}

  execute(input: { clientId: string; data: CreateTaskInput }): Promise<PersonalTask> {
    return this.productivity.createTask({
      clientId: input.clientId,
      text: input.data.text,
      dueDate: input.data.dueDate ?? null,
    });
  }
}
