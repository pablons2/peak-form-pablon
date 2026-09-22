import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";
import { ProductivityAccess } from "../productivity-access.service";

// PRD 10 §5.2 — misclick recovery: remove a (today's or a past) check-in.
// 404 both on a non-own habit and on "no check-in exists for that date" —
// there's nothing to distinguish for the caller either way.
@Injectable()
export class DeleteCheckInUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async execute(input: { clientId: string; habitId: string; date: string }): Promise<void> {
    const habit = await this.productivity.findHabitById(input.habitId, input.clientId);
    this.access.assertOwns(habit, "Habit not found");

    const deleted = await this.productivity.deleteCheckIn(input.habitId, input.date);
    if (!deleted) throw new NotFoundException("Check-in not found");
  }
}
