import { Inject, Injectable } from "@nestjs/common";
import type { HabitDefinition } from "@prisma/client";
import type { CreateHabitInput } from "@peakform/validation";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";

// PRD 10 §5.1 — Client creates a custom habit; free-text name, no preset
// library (§5.1's non-goal).
@Injectable()
export class CreateHabitUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
  ) {}

  execute(input: { clientId: string; data: CreateHabitInput }): Promise<HabitDefinition> {
    return this.productivity.createHabit({
      clientId: input.clientId,
      name: input.data.name,
      cadence: input.data.cadence,
      weekdays: input.data.weekdays,
      reminderTime: input.data.reminderTime ?? null,
    });
  }
}
