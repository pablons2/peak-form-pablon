// PRD 04 — Body Assessment input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

export const bodyAssessmentGoalTypeSchema = z.enum([
  "WEIGHT_LOSS",
  "MUSCLE_GAIN",
  "RECOMPOSITION",
  "PERFORMANCE",
  "REHABILITATION",
  "OTHER",
]);
export type BodyAssessmentGoalTypeInput = z.infer<
  typeof bodyAssessmentGoalTypeSchema
>;

export const photoTagSchema = z.enum(["PROGRESS", "POSTURE"]);
export type PhotoTagInput = z.infer<typeof photoTagSchema>;

// §5.7 — only the content types a photo upload can plausibly be; also caps
// what the presigned-PUT flow will sign for.
export const photoContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export type PhotoContentTypeInput = z.infer<typeof photoContentTypeSchema>;

export const requestPhotoUploadUrlSchema = z.object({
  tag: photoTagSchema,
  contentType: photoContentTypeSchema,
});
export type RequestPhotoUploadUrlInput = z.infer<
  typeof requestPhotoUploadUrlSchema
>;

const photoRefSchema = z.object({
  key: z.string().trim().min(1).max(500),
  tag: photoTagSchema,
});
export type PhotoRefInput = z.infer<typeof photoRefSchema>;

// §5.1 — Client's own quick self-log. Weight is the only required field;
// under-15-second target (§7) means everything else is optional.
export const createSelfLogSchema = z.object({
  weight: z.number().positive().max(500),
  note: z
    .preprocess(
      (v) => (v === "" ? null : v),
      z.string().trim().max(500).nullish(),
    ),
  photoKey: z
    .preprocess(
      (v) => (v === "" ? null : v),
      z.string().trim().min(1).max(500).nullish(),
    ),
});
export type CreateSelfLogInput = z.infer<typeof createSelfLogSchema>;

// §5.2 — circumferences (cm), right-side default; `bilateral` carries the
// optional left-side add-on (physiotherapist asymmetry tracking).
export const circumferencesSchema = z.object({
  neck: z.number().positive().max(200).optional(),
  chest: z.number().positive().max(200).optional(),
  waist: z.number().positive().max(200).optional(),
  hip: z.number().positive().max(200).optional(),
  armRelaxed: z.number().positive().max(100).optional(),
  armFlexed: z.number().positive().max(100).optional(),
  thigh: z.number().positive().max(150).optional(),
  calf: z.number().positive().max(100).optional(),
  bilateral: z
    .object({
      armRelaxedLeft: z.number().positive().max(100).optional(),
      armFlexedLeft: z.number().positive().max(100).optional(),
      thighLeft: z.number().positive().max(150).optional(),
      calfLeft: z.number().positive().max(100).optional(),
    })
    .optional(),
});
export type CircumferencesInput = z.infer<typeof circumferencesSchema>;

// §5.2 — Pollock 7-site skinfolds (mm). All seven are required together: a
// partial skinfold set can't drive a defensible body-density estimate.
export const skinfoldsSchema = z.object({
  chest: z.number().positive().max(100),
  midaxillary: z.number().positive().max(100),
  triceps: z.number().positive().max(100),
  subscapular: z.number().positive().max(100),
  abdominal: z.number().positive().max(100),
  suprailiac: z.number().positive().max(100),
  thigh: z.number().positive().max(100),
});
export type SkinfoldsInput = z.infer<typeof skinfoldsSchema>;

// §5.2 — Professional can override the computed %BF; the note is required
// whenever this object is present at all (not conditionally optional), so
// "manual override with no stated method" is unrepresentable.
export const bodyFatOverrideSchema = z.object({
  percent: z.number().min(0).max(100),
  note: z.string().trim().min(1).max(1000),
});
export type BodyFatOverrideInput = z.infer<typeof bodyFatOverrideSchema>;

// §5.2 — structured posture-screening checklist. Fixed string-literal
// vocabularies, not free text, per the PRD's explicit "not free text alone"
// requirement; `notes` remains free-text for anything the checklist misses.
export const postureScreeningSchema = z.object({
  headPosition: z.enum(["NEUTRAL", "FORWARD"]),
  shoulderLevel: z.enum(["SYMMETRIC", "ELEVATED_LEFT", "ELEVATED_RIGHT"]),
  scapularPosition: z.enum(["NORMAL", "WINGING"]),
  spinalCurvatureFlag: z.enum([
    "NONE",
    "SUSPECTED_KYPHOSIS",
    "SUSPECTED_LORDOSIS",
    "SUSPECTED_SCOLIOSIS",
  ]),
  pelvicTilt: z.enum(["NEUTRAL", "ANTERIOR", "POSTERIOR"]),
  kneeAlignment: z.enum(["NEUTRAL", "VARUS", "VALGUS"]),
  footPosture: z.enum(["NEUTRAL", "PRONATED", "SUPINATED"]),
  notes: z
    .preprocess(
      (v) => (v === "" ? null : v),
      z.string().trim().max(1000).nullish(),
    ),
});
export type PostureScreeningInput = z.infer<typeof postureScreeningSchema>;

export const bodyAssessmentGoalSchema = z.object({
  goalType: bodyAssessmentGoalTypeSchema,
  goalTargetValue: z.number().positive().max(1000).nullish(),
  goalTargetDate: z.coerce.date().nullish(),
  goalNote: z
    .preprocess(
      (v) => (v === "" ? null : v),
      z.string().trim().max(500).nullish(),
    ),
});
export type BodyAssessmentGoalInput = z.infer<typeof bodyAssessmentGoalSchema>;

// §5.2 — the Professional's formal assessment. Ordered to match the physical
// exam flow (§7): basic measurements → circumferences → skinfolds → posture
// → goals. `skinfolds` and `bodyFatOverride` are mutually exclusive in
// practice (the override replaces the computed value) but both optional at
// the schema level — the Application layer decides which %BF wins.
export const createFormalAssessmentSchema = z.object({
  weight: z.number().positive().max(500),
  height: z.number().positive().max(300),
  circumferences: circumferencesSchema.optional(),
  skinfolds: skinfoldsSchema.optional(),
  bodyFatOverride: bodyFatOverrideSchema.optional(),
  postureScreening: postureScreeningSchema.optional(),
  photos: z.array(photoRefSchema).max(10).optional(),
  goal: bodyAssessmentGoalSchema.optional(),
});
export type CreateFormalAssessmentInput = z.infer<
  typeof createFormalAssessmentSchema
>;
