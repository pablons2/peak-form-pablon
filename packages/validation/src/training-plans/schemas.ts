// PRD 06 — Training Plan Builder input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

export const weekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);
export type WeekdayInput = z.infer<typeof weekdaySchema>;

export const mesocycleGoalSchema = z.enum([
  "HYPERTROPHY",
  "STRENGTH",
  "ENDURANCE",
  "POWER",
  "GENERAL_FITNESS",
  "OTHER",
]);
export type MesocycleGoalInput = z.infer<typeof mesocycleGoalSchema>;

export const trainingPlanStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);
export type TrainingPlanStatusInput = z.infer<typeof trainingPlanStatusSchema>;

// §5.1 — a plan's own name/start date. `clientId`/`professionalId` are route
// input, not part of this shared field set (the create-plan and
// create-starter-template schemas below each compose what they need).
const planFields = {
  name: z.string().trim().min(2).max(120),
  startDate: z.coerce.date(),
};

export const createTrainingPlanSchema = z.object({
  ...planFields,
  clientId: z.string().min(1),
  // Only meaningful for an Admin caller (§4) — a Professional caller always
  // gets assigned themselves, this field is ignored for them.
  professionalId: z.string().min(1).optional(),
});
export type CreateTrainingPlanInput = z.infer<typeof createTrainingPlanSchema>;

export const createStarterTemplateSchema = z.object(planFields);
export type CreateStarterTemplateInput = z.infer<typeof createStarterTemplateSchema>;

export const updateTrainingPlanSchema = z
  .object({ ...planFields, status: trainingPlanStatusSchema })
  .partial();
export type UpdateTrainingPlanInput = z.infer<typeof updateTrainingPlanSchema>;

export const clonePlanSchema = z.object({
  targetClientId: z.string().min(1),
  professionalId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  startDate: z.coerce.date().optional(),
});
export type ClonePlanInput = z.infer<typeof clonePlanSchema>;

export const cloneMesocycleSchema = z.object({
  targetPlanId: z.string().min(1),
});
export type CloneMesocycleInput = z.infer<typeof cloneMesocycleSchema>;

// §5.2 — a training block. `order` is never client-supplied (server-assigned).
const mesocycleFields = {
  weeks: z.number().int().min(1).max(52),
  goal: mesocycleGoalSchema,
  isDeload: z.boolean().default(false),
};

export const createMesocycleSchema = z.object(mesocycleFields);
export type CreateMesocycleInput = z.infer<typeof createMesocycleSchema>;

export const updateMesocycleSchema = z.object(mesocycleFields).partial();
export type UpdateMesocycleInput = z.infer<typeof updateMesocycleSchema>;

// §5.5 — one prescribed exercise. targetRepsMax >= targetRepsMin when both
// are given (a single fixed rep count omits targetRepsMax entirely).
export const prescriptionExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    order: z.number().int().min(0),
    targetSets: z.number().int().min(1).max(20),
    targetRepsMin: z.number().int().min(1).max(100),
    targetRepsMax: z.number().int().min(1).max(100).nullish(),
    targetLoad: z.number().min(0).nullish(),
    targetPercent1RM: z.number().min(0).max(100).nullish(),
    targetRpe: z.number().min(0).max(10).nullish(),
    targetRir: z.number().min(0).max(10).nullish(),
    restSeconds: z.number().int().min(0).max(1800).nullish(),
    tempo: z.string().trim().max(20).nullish(),
    notes: z.string().trim().max(500).nullish(),
  })
  .refine(
    (v) => v.targetRepsMax == null || v.targetRepsMax >= v.targetRepsMin,
    { message: "targetRepsMax must be greater than or equal to targetRepsMin", path: ["targetRepsMax"] },
  );
export type PrescriptionExerciseInput = z.infer<typeof prescriptionExerciseSchema>;

// §5.3/§5.4 — one weekday's session within a mesocycle's weekly template.
export const weeklyTemplateEntrySchema = z.object({
  weekday: weekdaySchema,
  name: z.string().trim().min(1).max(120),
  exercises: z.array(prescriptionExerciseSchema).min(1).max(20),
});
export type WeeklyTemplateEntryInput = z.infer<typeof weeklyTemplateEntrySchema>;

export const saveWeeklyTemplateSchema = z
  .object({
    entries: z.array(weeklyTemplateEntrySchema).max(7),
  })
  .refine(
    (v) => new Set(v.entries.map((e) => e.weekday)).size === v.entries.length,
    { message: "Each weekday can appear at most once", path: ["entries"] },
  );
export type SaveWeeklyTemplateInput = z.infer<typeof saveWeeklyTemplateSchema>;

export const moveSessionSchema = z.object({
  date: z.coerce.date(),
});
export type MoveSessionInput = z.infer<typeof moveSessionSchema>;

export const replaceSessionExercisesSchema = z.object({
  exercises: z.array(prescriptionExerciseSchema).min(1).max(20),
});
export type ReplaceSessionExercisesInput = z.infer<typeof replaceSessionExercisesSchema>;
