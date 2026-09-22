import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { HabitCheckIn } from "@prisma/client";
import {
  PRODUCTIVITY_REPOSITORY,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";
import { ProductivityAccess } from "../productivity-access.service";

// PRD 10 §5.2 — check a habit off for a date (defaults to today, resolved
// by the caller so this stays clock-injectable/testable). Idempotent via
// the repository's upsert (schema's unique(habitDefinitionId, date)).
//
// Decision: an archived habit rejects with 404, the same "not found" the
// caller already gets for a non-own habit — an archived habit is already
// hidden from the active checklist (listActiveHabitsForClient), so from
// the Client's perspective it no longer exists as something checkable;
// there's no separate "this habit is archived" state worth exposing over
// a distinct 403, since re-checking one off isn't a permission question.
@Injectable()
export class CheckInHabitUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
    private readonly access: ProductivityAccess,
  ) {}

  async execute(input: {
    clientId: string;
    habitId: string;
    date: string;
  }): Promise<HabitCheckIn> {
    const habit = await this.productivity.findHabitById(input.habitId, input.clientId);
    const owned = this.access.assertOwns(habit, "Habit not found");
    if (owned.archivedAt) throw new NotFoundException("Habit not found");

    return this.productivity.upsertCheckIn(input.habitId, input.date);
  }
}
