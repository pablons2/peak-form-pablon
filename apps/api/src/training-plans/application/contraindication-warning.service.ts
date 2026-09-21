import { Inject, Injectable } from "@nestjs/common";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../exercises/domain/ports/exercise.repository.port";
import { IntakeGatingService } from "../../intake/application/intake-gating.service";
import { AuditLogService } from "../../shared/audit-log/audit-log.service";
import { matchContraindications } from "../domain/contraindication-cross-check";

export interface ContraindicationWarning {
  exerciseId: string;
  exerciseName: string;
  matchedTags: string[];
}

// PRD 06 §5.6 — "When a Professional adds an exercise to a Session for a
// specific Client, the system cross-references that exercise's
// contraindicationTags against the Client's current intake contraindications
// profile." Shared by the weekly-template save and the one-off
// session-exercise edit — both are genuine "prescribing an exercise for this
// client" moments (copying an already-vetted template exercise at
// generation time is not, so generation itself never calls this). A match
// never blocks the write (§8 — warning, not a hard block); it's surfaced in
// the response and recorded to the audit log for accountability.
@Injectable()
export class ContraindicationWarningService {
  constructor(
    @Inject(EXERCISE_REPOSITORY) private readonly exercises: ExerciseRepository,
    private readonly intakeGating: IntakeGatingService,
    private readonly auditLog: AuditLogService,
  ) {}

  async checkAndAudit(input: {
    actorId: string;
    clientId: string;
    entity: string;
    exerciseIds: string[];
  }): Promise<ContraindicationWarning[]> {
    const clientTags = await this.intakeGating.getContraindicationTagCodes(input.clientId);
    if (clientTags.length === 0) return [];

    const warnings: ContraindicationWarning[] = [];
    for (const exerciseId of new Set(input.exerciseIds)) {
      const exercise = await this.exercises.findById(exerciseId);
      if (!exercise) continue; // existence is validated by the caller separately

      const matchedTags = matchContraindications(
        exercise.contraindicationTags.map((t) => t.code),
        clientTags,
      );
      if (matchedTags.length === 0) continue;

      warnings.push({ exerciseId, exerciseName: exercise.name, matchedTags });
      await this.auditLog.record({
        actorId: input.actorId,
        action: "CONTRAINDICATED_EXERCISE_PRESCRIBED",
        entity: input.entity,
        entityId: exerciseId,
        metadata: { clientId: input.clientId, matchedTags },
      });
    }
    return warnings;
  }
}
