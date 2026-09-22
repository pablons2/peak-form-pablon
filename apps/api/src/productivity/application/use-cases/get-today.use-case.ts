import { Inject, Injectable } from "@nestjs/common";
import type { PersonalTask } from "@prisma/client";
import { isDueOn } from "../../domain/streak";
import {
  PRODUCTIVITY_REPOSITORY,
  type HabitDefinitionWithCheckIns,
  type ProductivityRepository,
} from "../../domain/ports/productivity.repository.port";

// PRD 10 §5.4 / PRD 09 (Today dashboard consumer) — "today's due habits
// (unchecked) and today's due tasks". §5.4's "(unchecked)" is implemented
// as a *flag*, not a filter: the feed returns every habit due today with
// its `checkedToday` state, so the checklist card can render the checked
// state and offer the uncheck path (DELETE check-in exists for misclick
// recovery — an unchecked-only feed would give it nowhere to live). A
// consumer wanting strictly the remaining items filters `!checkedToday`.
//
// Decision: a task counts as "due today" if it has a dueDate and that date
// is <= today — an overdue task (dueDate in the past, still not done)
// keeps surfacing here rather than silently disappearing once its date
// passes, which would be a worse outcome for a personal to-do list than
// PRD 09's literal "today's due tasks" wording. A task with no dueDate at
// all never appears on this feed (there's no "today" for it to be due on).
@Injectable()
export class GetTodayUseCase {
  constructor(
    @Inject(PRODUCTIVITY_REPOSITORY) private readonly productivity: ProductivityRepository,
  ) {}

  async execute(input: {
    clientId: string;
    today: string;
  }): Promise<{ habits: HabitDefinitionWithCheckIns[]; tasks: PersonalTask[] }> {
    const [habits, tasks] = await Promise.all([
      this.productivity.listActiveHabitsForClient(input.clientId),
      this.productivity.listTasksForClient(input.clientId),
    ]);

    const dueHabits = habits.filter((habit) =>
      isDueOn(habit.weekdays, input.today),
    );

    const dueTasks = tasks.filter(
      (task) =>
        !task.done &&
        task.dueDate !== null &&
        task.dueDate.toISOString().slice(0, 10) <= input.today,
    );

    return { habits: dueHabits, tasks: dueTasks };
  }
}
