"use server";

// Server actions for Productivity/Habits (PRD 10). Same contract as
// features/nutrition/actions.ts — re-validate with the shared zod schema,
// attach the session access token, map the API result onto {ok, message}.
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  createHabitSchema,
  createTaskSchema,
  type CreateHabitInput,
  type CreateTaskInput,
} from "@peakform/validation";
import { authOptions } from "../auth/nextauth-options";
import * as api from "./api-client";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.user?.id) return null;
  return { token: session.accessToken };
}

export async function createHabitAction(input: CreateHabitInput): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = createHabitSchema.safeParse(input);
  if (!parsed.success) return fail("Dados do hábito inválidos.");
  const result = await api.createHabit(session.token, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

export async function checkInHabitAction(habitId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.checkInHabit(session.token, habitId);
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

export async function uncheckHabitAction(habitId: string, date: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.uncheckHabit(session.token, habitId, date);
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

// §5.1's "archive" is a soft-delete via the same PATCH used for edits —
// updateHabitSchema's `archived: true` sets archivedAt server-side.
export async function archiveHabitAction(habitId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.updateHabit(session.token, habitId, { archived: true });
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return fail("Dados da tarefa inválidos.");
  const result = await api.createTask(session.token, parsed.data);
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

export async function toggleTaskAction(taskId: string, done: boolean): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.updateTask(session.token, taskId, { done });
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!session) return fail("Sessão expirada — entre novamente.");
  const result = await api.deleteTask(session.token, taskId);
  if (!result.ok) return fail(result.message);
  revalidatePath("/habits");
  return { ok: true };
}

