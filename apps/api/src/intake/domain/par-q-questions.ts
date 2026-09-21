// PRD 03 §5.1 — the PAR-Q-style readiness screen. A Domain-layer constant
// (not a DB enum — parqAnswers is stored as Json keyed by these codes) so a
// PT/physiotherapist can revise question wording later (§9 open question)
// without a schema migration. pt-BR copy for the actual question text lives
// only in the frontend's labels file (same split as PRD 05's
// MuscleGroup/Equipment enums vs. their frontend *_LABELS dictionaries) —
// this file is the code list every layer (validation, completeness check,
// contraindication mapping) agrees on.
export const PARQ_QUESTION_CODES = [
  "HEART_CONDITION",
  "CHEST_PAIN",
  "DIZZINESS_BALANCE",
  "BONE_JOINT_PROBLEM",
  "BLOOD_PRESSURE_MEDICATION",
  "OTHER_MEDICAL_REASON",
] as const;

export type ParqQuestionCode = (typeof PARQ_QUESTION_CODES)[number];

export type ParqAnswers = Partial<Record<ParqQuestionCode, boolean>>;

// §5.2 — "any PAR-Q 'yes' answer surfaces a visible advisory ... advisory
// only, does not block plan creation."
export function hasParqAdvisory(answers: ParqAnswers | null | undefined): boolean {
  return Object.values(answers ?? {}).some((answer) => answer === true);
}
