import type { HabitCheckIn, PersonalTask } from "@prisma/client";
import { computeStreak } from "../domain/streak";
import type { HabitDefinitionWithCheckIns } from "../domain/ports/productivity.repository.port";

function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// PRD 10 — this is the Client's own data (§4: no Professional/Admin view
// exists at all), so unlike e.g. IntakeSerializer there's nothing to
// strip for a different-role viewer; streak/checkedToday are computed
// here rather than stored, from the habit's own check-in history.
export function toPublicHabit(habit: HabitDefinitionWithCheckIns, today: string) {
  const checkedDates = habit.checkIns.map((c) => dateOnlyIso(c.date));
  const streak = computeStreak(
    checkedDates,
    habit.weekdays,
    today,
    dateOnlyIso(habit.createdAt),
  );
  return {
    id: habit.id,
    name: habit.name,
    cadence: habit.cadence,
    weekdays: habit.weekdays,
    reminderTime: habit.reminderTime,
    createdAt: habit.createdAt.toISOString(),
    archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
    streak,
    checkedToday: checkedDates.includes(today),
  };
}

export function toPublicTask(task: PersonalTask) {
  return {
    id: task.id,
    text: task.text,
    dueDate: task.dueDate ? dateOnlyIso(task.dueDate) : null,
    done: task.done,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

export function toPublicCheckIn(checkIn: HabitCheckIn) {
  return {
    id: checkIn.id,
    habitDefinitionId: checkIn.habitDefinitionId,
    date: dateOnlyIso(checkIn.date),
    checkedAt: checkIn.checkedAt.toISOString(),
  };
}
