import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ExerciseVisibility, Role } from "@prisma/client";
import type { UpdateExerciseInput } from "@peakform/validation";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { ExerciseInputValidator } from "../exercise-input-validator";

// PRD 05 §5.3/§4 — the owner edits their own PRIVATE custom exercise.
// GLOBAL (imported or promoted) records are only editable through the admin
// endpoints; non-owners get 404 so a private exercise's existence stays
// unobservable. Admins are allowed through here too per §4 ("create/edit a
// custom exercise").
@Injectable()
export class UpdateCustomExerciseUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly validator: ExerciseInputValidator,
  ) {}

  async execute(input: {
    actor: UserWithProfiles;
    exerciseId: string;
    data: UpdateExerciseInput;
  }) {
    const exercise = await this.exercises.findById(input.exerciseId);
    if (!exercise) throw new NotFoundException("Exercise not found");
    if (exercise.visibility !== ExerciseVisibility.PRIVATE) {
      throw new ForbiddenException(
        "Global exercises can only be edited by an admin",
      );
    }
    if (
      input.actor.role !== Role.ADMIN &&
      exercise.ownerProfessionalId !== input.actor.id
    ) {
      throw new NotFoundException("Exercise not found");
    }
    await this.validator.validate(input.data);
    return this.exercises.update(exercise.id, input.data);
  }
}
