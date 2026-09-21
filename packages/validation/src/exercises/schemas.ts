// PRD 05 — Exercise Library input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// These mirror the Prisma enums (same pattern as specializationSchema ↔
// Specialization): the DB enum is the integrity boundary, this is the input
// boundary. Keep the two lists in sync when the vocabulary grows.
export const muscleGroupSchema = z.enum([
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "CORE",
  "GLUTES",
  "QUADRICEPS",
  "HAMSTRINGS",
  "CALVES",
  "FULL_BODY",
]);
export type MuscleGroupInput = z.infer<typeof muscleGroupSchema>;

export const equipmentSchema = z.enum([
  "BODYWEIGHT",
  "DUMBBELL",
  "BARBELL",
  "KETTLEBELL",
  "RESISTANCE_BAND",
  "CABLE",
  "MACHINE",
  "MEDICINE_BALL",
  "BENCH",
  "PULL_UP_BAR",
  "STABILITY_BALL",
  "FOAM_ROLLER",
]);
export type EquipmentInput = z.infer<typeof equipmentSchema>;

export const difficultySchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);
export type DifficultyInput = z.infer<typeof difficultySchema>;

// §5.2 — every exercise carries written cues (2–4 bullets) and common
// mistakes, not just a name and media. contraindicationCodes reference the
// ContraindicationTag vocabulary this module owns (existence is re-checked
// against the table in the use-case, since the vocabulary grows over time).
const exerciseFields = {
  name: z.string().trim().min(2).max(120),
  // Optional: §5.3 doesn't require Professionals to supply media for a
  // custom exercise. Imported/global records always carry one. An empty
  // string (an untouched form field) normalizes to null rather than failing
  // URL validation.
  mediaUrl: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().trim().url().max(2000).nullish(),
  ),
  muscleGroups: z.array(muscleGroupSchema).min(1).max(12),
  equipment: z.array(equipmentSchema).min(1).max(12),
  difficulty: difficultySchema,
  cues: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  mistakes: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  contraindicationCodes: z
    .array(z.string().trim().min(1).max(80))
    .max(20)
    .default([]),
};

// §5.3 — Professional-authored custom exercise; created PRIVATE and owned by
// the caller regardless of what the body says (the route sets those fields).
export const createCustomExerciseSchema = z.object(exerciseFields);
export type CreateCustomExerciseInput = z.infer<
  typeof createCustomExerciseSchema
>;

// Editable fields only — visibility/ownership are never client input. Shared
// by the owner-edit (custom) and admin-edit routes.
export const updateExerciseSchema = z.object(exerciseFields).partial();
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;

// §5.3 — Admin authoring a GLOBAL exercise directly (or editing any record
// through the admin endpoints). Same field set; the route applies the
// visibility/ownership semantics.
export const upsertExerciseAsAdminSchema = z.object(exerciseFields);
export type UpsertExerciseAsAdminInput = z.infer<
  typeof upsertExerciseAsAdminSchema
>;

// §5.4 — browse/picker search. All filters optional and composable.
export const exerciseSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  muscleGroup: muscleGroupSchema.optional(),
  equipment: equipmentSchema.optional(),
  difficulty: difficultySchema.optional(),
});
export type ExerciseSearchInput = z.infer<typeof exerciseSearchSchema>;
