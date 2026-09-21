// PRD 03 — Onboarding / Intake (Anamnesis + PAR-Q) input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// Mirrors the Prisma BodyRegion enum — same pattern as PRD 05's
// muscleGroupSchema/equipmentSchema.
export const bodyRegionSchema = z.enum([
  "NECK",
  "SHOULDER_LEFT",
  "SHOULDER_RIGHT",
  "UPPER_BACK",
  "LOWER_BACK",
  "CHEST",
  "ABDOMEN",
  "HIP_LEFT",
  "HIP_RIGHT",
  "ELBOW_LEFT",
  "ELBOW_RIGHT",
  "WRIST_LEFT",
  "WRIST_RIGHT",
  "KNEE_LEFT",
  "KNEE_RIGHT",
  "ANKLE_LEFT",
  "ANKLE_RIGHT",
]);
export type BodyRegionInput = z.infer<typeof bodyRegionSchema>;

// Mirrors the Prisma MedicalCondition enum.
export const medicalConditionSchema = z.enum([
  "DIABETES",
  "CARDIOVASCULAR_DISEASE",
  "HYPERTENSION",
  "ASTHMA_OR_RESPIRATORY",
  "PREGNANCY",
  "OTHER",
]);
export type MedicalConditionInput = z.infer<typeof medicalConditionSchema>;

// Mirrors apps/api/src/intake/domain/par-q-questions.ts's PARQ_QUESTION_CODES
// — kept in sync by hand (it's a short, stable, safety-reviewed list; see
// PRD 03 §9's open question about validating the exact wording with a
// licensed PT before ship).
export const parqQuestionCodeSchema = z.enum([
  "HEART_CONDITION",
  "CHEST_PAIN",
  "DIZZINESS_BALANCE",
  "BONE_JOINT_PROBLEM",
  "BLOOD_PRESSURE_MEDICATION",
  "OTHER_MEDICAL_REASON",
]);
export type ParqQuestionCodeInput = z.infer<typeof parqQuestionCodeSchema>;

export const painFlagSchema = z.object({
  region: bodyRegionSchema,
  severity: z.number().int().min(0).max(10),
  pastOrCurrent: z.enum(["PAST", "CURRENT"]),
});
export type PainFlagInput = z.infer<typeof painFlagSchema>;

export const availabilitySchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  sessionDurationMinutes: z.number().int().min(10).max(240),
});
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

export const equipmentAccessSchema = z.object({
  location: z.enum(["HOME", "GYM"]),
  homeEquipment: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});
export type EquipmentAccessInput = z.infer<typeof equipmentAccessSchema>;

// §5.1 — every section is independently optional on a single PATCH so the
// multi-step wizard can autosave one step at a time; §5.2's "not a locally
// free-text empty string" rule (empty string -> null) applies the same way
// PRD 05's mediaUrl does.
const nullableText = (max: number) =>
  z.preprocess((v) => (v === "" ? null : v), z.string().trim().max(max).nullish());

export const updateIntakeSchema = z.object({
  parqAnswers: z.record(parqQuestionCodeSchema, z.boolean()).optional(),
  painFlags: z.array(painFlagSchema).max(30).optional(),
  medicalConditions: z.array(medicalConditionSchema).max(10).optional(),
  medicalConditionsOtherNote: nullableText(500),
  medications: nullableText(500),
  availability: availabilitySchema.optional(),
  equipmentAccess: equipmentAccessSchema.optional(),
});
export type UpdateIntakeInput = z.infer<typeof updateIntakeSchema>;

// §5.3 — the disclaimer checkbox must be explicitly checked; anything else
// (missing, false) fails validation rather than silently defaulting.
export const skipIntakeSchema = z.object({
  acknowledged: z.literal(true),
});
export type SkipIntakeInput = z.infer<typeof skipIntakeSchema>;

// §5.4 — a Professional's clinical note on one intake version.
export const addProfessionalAnnotationSchema = z.object({
  note: z.string().trim().min(1).max(2000),
});
export type AddProfessionalAnnotationInput = z.infer<
  typeof addProfessionalAnnotationSchema
>;
