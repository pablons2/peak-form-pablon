import { Injectable } from "@nestjs/common";
import type { HabitCheckIn, HabitDefinition, PersonalTask } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateHabitData,
  CreateTaskData,
  HabitDefinitionWithCheckIns,
  ProductivityRepository,
  UpdateHabitData,
  UpdateTaskData,
} from "../domain/ports/productivity.repository.port";

function toUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

@Injectable()
export class PrismaProductivityRepository implements ProductivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  createHabit(data: CreateHabitData): Promise<HabitDefinition> {
    return this.prisma.habitDefinition.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        cadence: data.cadence,
        weekdays: data.weekdays,
        reminderTime: data.reminderTime ?? null,
      },
    });
  }

  findHabitById(id: string, clientId: string): Promise<HabitDefinitionWithCheckIns | null> {
    return this.prisma.habitDefinition.findFirst({
      where: { id, clientId },
      include: { checkIns: true },
    });
  }

  listActiveHabitsForClient(clientId: string): Promise<HabitDefinitionWithCheckIns[]> {
    return this.prisma.habitDefinition.findMany({
      where: { clientId, archivedAt: null },
      include: { checkIns: true },
      orderBy: { createdAt: "asc" },
    });
  }

  updateHabit(id: string, data: UpdateHabitData): Promise<HabitDefinitionWithCheckIns> {
    return this.prisma.habitDefinition.update({
      where: { id },
      data: {
        name: data.name,
        cadence: data.cadence,
        weekdays: data.weekdays,
        ...("reminderTime" in data ? { reminderTime: data.reminderTime } : {}),
        ...("archivedAt" in data ? { archivedAt: data.archivedAt } : {}),
      },
      include: { checkIns: true },
    });
  }

  upsertCheckIn(habitId: string, date: string): Promise<HabitCheckIn> {
    const day = toUtcDate(date);
    return this.prisma.habitCheckIn.upsert({
      where: { habitDefinitionId_date: { habitDefinitionId: habitId, date: day } },
      create: { habitDefinitionId: habitId, date: day },
      // A repeat check-in for the same day is a no-op beyond refreshing
      // checkedAt — the unique constraint already guarantees no duplicate
      // row is ever created (§5.2/§10 idempotency).
      update: { checkedAt: new Date() },
    });
  }

  async deleteCheckIn(habitId: string, date: string): Promise<boolean> {
    const { count } = await this.prisma.habitCheckIn.deleteMany({
      where: { habitDefinitionId: habitId, date: toUtcDate(date) },
    });
    return count > 0;
  }

  listCheckInsForHabit(habitId: string): Promise<HabitCheckIn[]> {
    return this.prisma.habitCheckIn.findMany({
      where: { habitDefinitionId: habitId },
      orderBy: { date: "asc" },
    });
  }

  createTask(data: CreateTaskData): Promise<PersonalTask> {
    return this.prisma.personalTask.create({
      data: {
        clientId: data.clientId,
        text: data.text,
        dueDate: data.dueDate ? toUtcDate(data.dueDate) : null,
      },
    });
  }

  findTaskById(id: string, clientId: string): Promise<PersonalTask | null> {
    return this.prisma.personalTask.findFirst({ where: { id, clientId } });
  }

  // Pending tasks first, each group oldest-first — a simple, predictable
  // ordering for a flat list with no priority levels (§3 Non-Goals).
  listTasksForClient(clientId: string): Promise<PersonalTask[]> {
    return this.prisma.personalTask.findMany({
      where: { clientId },
      orderBy: [{ done: "asc" }, { createdAt: "asc" }],
    });
  }

  updateTask(id: string, data: UpdateTaskData): Promise<PersonalTask> {
    return this.prisma.personalTask.update({
      where: { id },
      data: {
        text: data.text,
        ...("dueDate" in data
          ? { dueDate: data.dueDate ? toUtcDate(data.dueDate) : null }
          : {}),
        done: data.done,
        ...("completedAt" in data ? { completedAt: data.completedAt } : {}),
      },
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.prisma.personalTask.delete({ where: { id } });
  }
}
