import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ExerciseVisibility, Role } from "@prisma/client";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";

// PRD 05 §4 — delete a custom exercise. Owner-only for Professionals
// (non-owners get 404); Admins may also remove customs through this route.
// Hard delete: PRD 06's SessionExercise doesn't exist yet — when it lands,
// this path needs to restrict-or-null referenced rows (noted in the
// implementation checklist).
@Injectable()
export class DeleteCustomExerciseUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
  ) {}

  async execute(input: { actor: UserWithProfiles; exerciseId: string }) {
    const exercise = await this.exercises.findById(input.exerciseId);
    if (!exercise) throw new NotFoundException("Exercise not found");
    if (exercise.visibility !== ExerciseVisibility.PRIVATE) {
      throw new ForbiddenException(
        "Global exercises can only be deleted by an admin",
      );
    }
    if (
      input.actor.role !== Role.ADMIN &&
      exercise.ownerProfessionalId !== input.actor.id
    ) {
      throw new NotFoundException("Exercise not found");
    }
    await this.exercises.delete(exercise.id);
  }
}
