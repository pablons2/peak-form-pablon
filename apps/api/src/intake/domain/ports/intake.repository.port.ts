import type {
  BodyRegion,
  IntakeAssessment,
  IntakeStatus,
  MedicalCondition,
  PainFlag,
  PainRecency,
  ProfessionalAnnotation,
} from "@prisma/client";

export const INTAKE_REPOSITORY = Symbol("INTAKE_REPOSITORY");

export type AnnotationWithAuthor = ProfessionalAnnotation & {
  professional: { id: string; fullName: string; email: string };
};

export type IntakeWithAnnotations = IntakeAssessment & {
  painFlags: PainFlag[];
  annotations: AnnotationWithAuthor[];
};

export interface CreateIntakeData {
  clientId: string;
}

export interface PainFlagWriteData {
  region: BodyRegion;
  severity: number;
  pastOrCurrent: PainRecency;
}

export interface UpdateIntakeData {
  parqAnswers?: Record<string, boolean> | null;
  /// Replaces the whole set (deleteMany+create) — a write that omits a
  /// region must actually remove it, same "set" semantics PRD 05 uses for
  /// Exercise.contraindicationTags.
  painFlags?: PainFlagWriteData[];
  medicalConditions?: MedicalCondition[];
  medicalConditionsOtherNote?: string | null;
  medications?: string | null;
  availability?: unknown;
  equipmentAccess?: unknown;
  status?: IntakeStatus;
  contraindicationTagCodes?: string[];
  completedAt?: Date | null;
}

export type { BodyRegion, IntakeStatus, MedicalCondition, PainFlag, PainRecency };

/// Infrastructure implements this (base doc §7.2 DIP); Application use-cases
/// depend only on this interface. Versioning (§5.3 — "start a new version
/// rather than editing in place") is a use-case concern: this port is
/// deliberately CRUD/query-shaped, `create` always starts version = (current
/// max for the client) + 1.
export interface IntakeRepository {
  findById(id: string): Promise<IntakeWithAnnotations | null>;
  /// The client's current draft (status IN_PROGRESS), if any — at most one
  /// exists at a time per client.
  findDraftForClient(clientId: string): Promise<IntakeWithAnnotations | null>;
  /// All versions for a client, newest first.
  listVersionsForClient(clientId: string): Promise<IntakeWithAnnotations[]>;

  create(data: CreateIntakeData): Promise<IntakeWithAnnotations>;
  update(id: string, data: UpdateIntakeData): Promise<IntakeWithAnnotations>;

  addAnnotation(
    intakeAssessmentId: string,
    professionalId: string,
    note: string,
  ): Promise<AnnotationWithAuthor>;
}
