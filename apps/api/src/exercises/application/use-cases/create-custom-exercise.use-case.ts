import { Inject, Injectable } from "@nestjs/common";
import { ExerciseVisibility } from "@prisma/client";
import type { CreateCustomExerciseInput } from "@peakform/validation";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { ExerciseInputValidator } from "../exercise-input-validator";

// PRD 05 §5.3 — a Professional (or Admin, §4) authors a custom exercise.
// Always created PRIVATE and owned by the caller — the route can never set
// visibility/ownership; promotion to GLOBAL is a separate Admin decision.
@Injectable()
export class CreateCustomExerciseUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly validator: ExerciseInputValidator,
  ) {}

  async execute(input: {
    owner: UserWithProfiles;
    data: CreateCustomExerciseInput;
  }) {
    await this.validator.validate(input.data);
    return this.exercises.create({
      ...input.data,
      mediaUrl: input.data.mediaUrl ?? null,
      visibility: ExerciseVisibility.PRIVATE,
      ownerProfessionalId: input.owner.id,
    });
  }
}
