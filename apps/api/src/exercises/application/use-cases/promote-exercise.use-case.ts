import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ExerciseVisibility } from "@prisma/client";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";

// PRD 05 §5.3 — an Admin reviews a Professional's PRIVATE custom exercise and
// promotes it into the global library. Promotion clears the owner per §6
// ("ownerProfessionalId null for global"); the previous owner is preserved in
// the audit entry's metadata.
@Injectable()
export class PromoteExerciseUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(input: { adminId: string; exerciseId: string }) {
    const exercise = await this.exercises.findById(input.exerciseId);
    if (!exercise) throw new NotFoundException("Exercise not found");
    if (exercise.visibility === ExerciseVisibility.GLOBAL) {
      throw new ConflictException("This exercise is already global");
    }

    const promoted = await this.exercises.update(exercise.id, {
      visibility: ExerciseVisibility.GLOBAL,
      ownerProfessionalId: null,
    });

    await this.auditLog.record({
      actorId: input.adminId,
      action: "EXERCISE_PROMOTED_TO_GLOBAL",
      entity: "Exercise",
      entityId: exercise.id,
      metadata: {
        name: exercise.name,
        previousOwnerProfessionalId: exercise.ownerProfessionalId,
      },
    });

    return promoted;
  }
}
