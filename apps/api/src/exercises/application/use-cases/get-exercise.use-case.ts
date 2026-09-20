import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { ExerciseAccess } from "../exercise-access.service";

// PRD 05 §4 — exercise detail. A PRIVATE exercise that isn't visible to the
// viewer returns 404 (not 403) so its existence isn't leaked.
@Injectable()
export class GetExerciseUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly access: ExerciseAccess,
  ) {}

  async execute(input: { viewer: UserWithProfiles; exerciseId: string }) {
    const exercise = await this.exercises.findById(input.exerciseId);
    if (!exercise) throw new NotFoundException("Exercise not found");
    const scope = await this.access.scopeFor(input.viewer);
    if (!this.access.canView(scope, exercise)) {
      throw new NotFoundException("Exercise not found");
    }
    return exercise;
  }
}
