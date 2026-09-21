import type { IntakeWithAnnotations } from "../domain/ports/intake.repository.port";

// A Professional's annotations are clinical notes about the Client, not
// something PRD 03 §4's permission table grants the Client visibility into
// (only "Review/annotate" is explicitly scoped away from Client; reading
// them back isn't granted either, so the conservative default is to keep
// them out of the Client-facing shape entirely).
function toPublicIntake(
  intake: IntakeWithAnnotations,
  opts: { includeAnnotations: boolean },
) {
  return {
    id: intake.id,
    clientId: intake.clientId,
    version: intake.version,
    status: intake.status,
    parqAnswers: intake.parqAnswers,
    painFlags: intake.painFlags,
    medicalConditions: intake.medicalConditions,
    medicalConditionsOtherNote: intake.medicalConditionsOtherNote,
    medications: intake.medications,
    availability: intake.availability,
    equipmentAccess: intake.equipmentAccess,
    contraindicationTagCodes: intake.contraindicationTagCodes,
    completedAt: intake.completedAt,
    createdAt: intake.createdAt,
    updatedAt: intake.updatedAt,
    annotations: opts.includeAnnotations
      ? intake.annotations.map((a) => ({
          id: a.id,
          note: a.note,
          createdAt: a.createdAt,
          professional: a.professional,
        }))
      : undefined,
  };
}

export function toPublicIntakeForClient(intake: IntakeWithAnnotations) {
  return toPublicIntake(intake, { includeAnnotations: false });
}

export function toPublicIntakeForProfessional(intake: IntakeWithAnnotations) {
  return toPublicIntake(intake, { includeAnnotations: true });
}
