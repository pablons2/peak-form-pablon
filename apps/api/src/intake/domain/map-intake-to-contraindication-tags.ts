import type { BodyRegion, MedicalCondition, PainRecency } from "@prisma/client";
import type { ParqAnswers } from "./par-q-questions";

export interface PainFlagInput {
  region: BodyRegion;
  severity: number;
  pastOrCurrent: PainRecency;
}

// PRD 03 §5.2 — "each flagged body region + condition maps to one or more
// contraindication tags, using the exact same ContraindicationTag codes
// [PRD 05] attaches to exercises ... this module never defines its own tag
// codes, it only selects from PRD 05's set." These codes are the exact
// vocabulary seeded by the prd05 migration (apps/api/prisma/migrations/
// 20260919154051_prd05_exercise_library/migration.sql) — verified against it
// rather than assumed, since a typo here would silently produce a dangling
// reference PRD 06 could never match against an Exercise.
//
// Only a CURRENT pain flag contributes a tag (a resolved past injury is
// recorded for the Professional's context but isn't itself an active
// contraindication) — mirrors §5.2's own example, "current low-back pain".
const REGION_TAGS: Partial<Record<BodyRegion, string>> = {
  NECK: "NECK_STRAIN_CAUTION",
  SHOULDER_LEFT: "SHOULDER_IMPINGEMENT_CAUTION",
  SHOULDER_RIGHT: "SHOULDER_IMPINGEMENT_CAUTION",
  LOWER_BACK: "LOWER_BACK_LOAD_CAUTION",
  HIP_LEFT: "HIP_MOBILITY_CAUTION",
  HIP_RIGHT: "HIP_MOBILITY_CAUTION",
  KNEE_LEFT: "KNEE_LOAD_CAUTION",
  KNEE_RIGHT: "KNEE_LOAD_CAUTION",
  WRIST_LEFT: "WRIST_LOAD_CAUTION",
  WRIST_RIGHT: "WRIST_LOAD_CAUTION",
  ELBOW_LEFT: "ELBOW_OVERUSE_CAUTION",
  ELBOW_RIGHT: "ELBOW_OVERUSE_CAUTION",
  ANKLE_LEFT: "HIGH_IMPACT_CAUTION",
  ANKLE_RIGHT: "HIGH_IMPACT_CAUTION",
  // UPPER_BACK, CHEST, ABDOMEN intentionally unmapped — no PRD 05 tag fits;
  // still recorded on the intake for the Professional to read directly.
};

const PARQ_TAGS: Partial<Record<string, string>> = {
  HEART_CONDITION: "BLOOD_PRESSURE_CAUTION",
  CHEST_PAIN: "BLOOD_PRESSURE_CAUTION",
  BLOOD_PRESSURE_MEDICATION: "BLOOD_PRESSURE_CAUTION",
  DIZZINESS_BALANCE: "HIGH_IMPACT_CAUTION",
  // BONE_JOINT_PROBLEM/OTHER_MEDICAL_REASON are too unspecific to map to one
  // exercise tag — the body-map picker is what captures the specific joint.
};

const CONDITION_TAGS: Partial<Record<MedicalCondition, string>> = {
  CARDIOVASCULAR_DISEASE: "BLOOD_PRESSURE_CAUTION",
  HYPERTENSION: "BLOOD_PRESSURE_CAUTION",
  PREGNANCY: "HIGH_IMPACT_CAUTION",
  ASTHMA_OR_RESPIRATORY: "HIGH_IMPACT_CAUTION",
  // DIABETES/OTHER don't map to a specific movement caution.
};

export function mapIntakeToContraindicationTags(input: {
  parqAnswers: ParqAnswers | null | undefined;
  painFlags: PainFlagInput[] | null | undefined;
  medicalConditions: MedicalCondition[] | null | undefined;
}): string[] {
  const tags = new Set<string>();

  for (const flag of input.painFlags ?? []) {
    if (flag.pastOrCurrent !== "CURRENT") continue;
    const tag = REGION_TAGS[flag.region];
    if (tag) tags.add(tag);
  }

  for (const [code, answer] of Object.entries(input.parqAnswers ?? {})) {
    if (answer !== true) continue;
    const tag = PARQ_TAGS[code];
    if (tag) tags.add(tag);
  }

  for (const condition of input.medicalConditions ?? []) {
    const tag = CONDITION_TAGS[condition];
    if (tag) tags.add(tag);
  }

  return [...tags];
}
