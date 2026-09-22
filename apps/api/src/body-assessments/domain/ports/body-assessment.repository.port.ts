import type {
  BodyAssessment,
  BodyAssessmentGoalType,
  BodyAssessmentSource,
  BodyFatSource,
} from "@prisma/client";

export const BODY_ASSESSMENT_REPOSITORY = Symbol("BODY_ASSESSMENT_REPOSITORY");

export interface PhotoRef {
  key: string;
  tag: "PROGRESS" | "POSTURE";
}

export interface CreateBodyAssessmentData {
  clientId: string;
  source: BodyAssessmentSource;
  validatedById?: string | null;
  recordedAt?: Date;
  protocolVersion?: string | null;
  weight: number;
  height?: number | null;
  bmi?: number | null;
  circumferences?: Record<string, unknown> | null;
  waistHipRatio?: number | null;
  skinfolds?: Record<string, unknown> | null;
  bodyFatPercent?: number | null;
  bodyFatSource?: BodyFatSource | null;
  bodyFatOverrideNote?: string | null;
  postureScreening?: Record<string, unknown> | null;
  photos?: PhotoRef[] | null;
  goalType?: BodyAssessmentGoalType | null;
  goalTargetValue?: number | null;
  goalTargetDate?: Date | null;
  goalNote?: string | null;
  note?: string | null;
}

/// Infrastructure implements this (base doc §7.2 DIP). Deliberately exposes
/// no update/delete method at all — PRD 04 §5.4's append-only rule is a
/// compile-time property of this interface, not a runtime check layered on
/// top of a general-purpose CRUD repository.
export interface BodyAssessmentRepository {
  create(data: CreateBodyAssessmentData): Promise<BodyAssessment>;
  listForClient(clientId: string): Promise<BodyAssessment[]>;
  /// PRD 08 §5.1 — the Mifflin-St Jeor draft estimate's weight input: the
  /// most recent BodyAssessment of any source (self-reported entries always
  /// carry weight). Null if the Client has none yet, which the calling
  /// module (Nutrition) turns into its own missing-input guard rather than
  /// this module reaching into that rule.
  findLatestForClient(clientId: string): Promise<BodyAssessment | null>;
  /// PRD 08 §5.1's height input: self-reported entries never carry height
  /// (§5.1 self-log is weight-only), so this is deliberately a *separate*
  /// "most recent entry that has a height" query rather than assuming the
  /// single latest row has both — a Client who only self-logs weight daily
  /// but had one formal assessment months ago should still get a usable
  /// height for the formula.
  findLatestWithHeightForClient(clientId: string): Promise<BodyAssessment | null>;
}
