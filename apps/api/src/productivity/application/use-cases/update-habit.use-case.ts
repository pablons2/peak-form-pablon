import { Inject, Injectable } from "@nestjs/common";
import type { UpdateHabitInput } from "@peakform/validation";
import {
  PRODUCTIVITY_REPOSITORY,
  type HabitDefinitionWithCheckIns,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";
import { ProductivityAccess } from "../productivity-access.service";

// PRD 10 §5.1 — edit a habit's name/cadence/weekdays/reminder, or
// archive/unarchive it. `archived: true` sets archivedAt=now; `archived:
// false` clears it — the request body never sends a raw Date, keeping the
// server the sole authority on the archival timestamp.
@Injectable()
export class UpdateHabitUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async execute(input: {
    clientId: string;
    habitId: string;
    data: UpdateHabitInput;
  }): Promise<HabitDefinitionWithCheckIns> {
    const habit = await this.productivity.findHabitById(input.habitId, input.clientId);
    this.access.assertOwns(habit, "Habit not found");

    const { archived, ...rest } = input.data;
    return this.productivity.updateHabit(input.habitId, {
      ...rest,
      ...(archived === true ? { archivedAt: new Date() } : {}),
      ...(archived === false ? { archivedAt: null } : {}),
    });
  }
}
