import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";

// PRD 05 §4/§5.3 — Admin removes an exercise from the catalog (curation;
// complements "promote or leave private" review decisions). Audited like the
// other admin actions.
@Injectable()
export class DeleteExerciseAsAdminUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(input: { adminId: string; exerciseId: string }) {
    const exercise = await this.exercises.findById(input.exerciseId);
    if (!exercise) throw new NotFoundException("Exercise not found");
    await this.exercises.delete(exercise.id);
    await this.auditLog.record({
      actorId: input.adminId,
      action: "EXERCISE_DELETED",
      entity: "Exercise",
      entityId: exercise.id,
      metadata: { name: exercise.name, visibility: exercise.visibility },
    });
  }
}
