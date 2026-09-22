import type { HabitCadence, HabitCheckIn, HabitDefinition, PersonalTask, Weekday } from "@prisma/client";

export const PRODUCTIVITY_REPOSITORY = Symbol("PRODUCTIVITY_REPOSITORY");

export type HabitDefinitionWithCheckIns = HabitDefinition & { checkIns: HabitCheckIn[] };

export interface CreateHabitData {
  clientId: string;
  name: string;
  cadence: HabitCadence;
  weekdays: Weekday[];
  reminderTime?: string | null;
}

export interface UpdateHabitData {
  name?: string;
  cadence?: HabitCadence;
  weekdays?: Weekday[];
  /// Same absent/null/string semantics as UpdateTaskData.dueDate above.
  reminderTime?: string | null;
  archivedAt?: Date | null;
}

export interface CreateTaskData {
  clientId: string;
  text: string;
  dueDate?: string | null;
}

export interface UpdateTaskData {
  text?: string;
  /// Absent key = leave dueDate untouched; `null` = clear it; a string =
  /// set it. The use-case only includes this key when the caller's
  /// request body actually contained `dueDate` (§10 update semantics —
  /// undefined vs. null are meaningfully different, not interchangeable).
  dueDate?: string | null;
  done?: boolean;
  completedAt?: Date | null;
}

/// Infrastructure implements this (base doc §7.2 DIP). Every method that
/// touches a single habit/task is scoped by (id, clientId) — never a bare
/// findById — so "does this row belong to the caller" is structural, not
/// something a use-case can forget to check (PRD 10 §4/§10: Client-only,
/// own-data-only, no Professional/Admin path exists at all).
export interface ProductivityRepository {
  createHabit(data: CreateHabitData): Promise<HabitDefinition>;
  findHabitById(id: string, clientId: string): Promise<HabitDefinitionWithCheckIns | null>;
  /// Non-archived habits only (archivedAt null), each with its full
  /// check-in history so callers can compute streak/checkedToday without a
  /// second round-trip.
  listActiveHabitsForClient(clientId: string): Promise<HabitDefinitionWithCheckIns[]>;
  /// Returns with its check-in history included (not just the bare row) so
  /// the presentation layer can compute streak/checkedToday from the
  /// response without a second round-trip.
  updateHabit(id: string, data: UpdateHabitData): Promise<HabitDefinitionWithCheckIns>;

  /// Idempotent by the (habitDefinitionId, date) unique constraint — a
  /// second check-in for the same day upserts rather than duplicating.
  upsertCheckIn(habitId: string, date: string): Promise<HabitCheckIn>;
  /// Returns true if a check-in existed and was removed, false if there
  /// was nothing to delete (misclick-recovery: deleting a non-existent
  /// check-in is a no-op, not an error at this layer).
  deleteCheckIn(habitId: string, date: string): Promise<boolean>;
  listCheckInsForHabit(habitId: string): Promise<HabitCheckIn[]>;

  createTask(data: CreateTaskData): Promise<PersonalTask>;
  findTaskById(id: string, clientId: string): Promise<PersonalTask | null>;
  listTasksForClient(clientId: string): Promise<PersonalTask[]>;
  updateTask(id: string, data: UpdateTaskData): Promise<PersonalTask>;
  deleteTask(id: string): Promise<void>;
}
