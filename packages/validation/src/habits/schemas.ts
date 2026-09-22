// PRD 10 — Productivity / Habits input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";
// The Weekday vocabulary is owned by training-plans/schemas (the API
// schema's Weekday enum, PRD 06) — imported, not redefined, so this
// package's barrel doesn't export the same symbol twice.
import { weekdaySchema } from "../training-plans/schemas";

export const habitCadenceSchema = z.enum(["DAILY", "SPECIFIC_WEEKDAYS"]);
export type HabitCadenceInput = z.infer<typeof habitCadenceSchema>;

// "HH:MM" 24h time-of-day — matches the plain-String storage decision in
// schema.prisma (a bare time has no timezone to pin).
export const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido — use HH:MM");

// §5.1 — name + cadence (+ weekdays when SPECIFIC_WEEKDAYS) + optional
// reminder time. No preset library: the name is free text (§5.1).
export const createHabitSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    cadence: habitCadenceSchema.default("DAILY"),
    weekdays: z.array(weekdaySchema).default([]),
    reminderTime: reminderTimeSchema.nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.cadence === "SPECIFIC_WEEKDAYS" && data.weekdays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weekdays"],
        message: "Selecione ao menos um dia da semana",
      });
    }
  });
export type CreateHabitInput = z.infer<typeof createHabitSchema>;

// Edits reuse the same field rules, all optional; `archived` toggles the
// soft-delete (archivedAt set/cleared server-side).
export const updateHabitSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  cadence: habitCadenceSchema.optional(),
  weekdays: z.array(weekdaySchema).optional(),
  reminderTime: reminderTimeSchema.nullish(),
  archived: z.boolean().optional(),
});
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida — use AAAA-MM-DD");

// §5.2 — check off a habit for a date (defaults to today server-side).
// The unique(habitDefinitionId, date) constraint makes this idempotent.
export const checkInHabitSchema = z.object({
  date: isoDateSchema.optional(),
});
export type CheckInHabitInput = z.infer<typeof checkInHabitSchema>;

// §5.3 — flat personal task: text + optional due date. No sub-tasks, no
// priorities (§3).
export const createTaskSchema = z.object({
  text: z.string().trim().min(1).max(500),
  dueDate: isoDateSchema.nullish(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  text: z.string().trim().min(1).max(500).optional(),
  // null clears the due date explicitly; undefined leaves it untouched.
  dueDate: isoDateSchema.nullish(),
  done: z.boolean().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
