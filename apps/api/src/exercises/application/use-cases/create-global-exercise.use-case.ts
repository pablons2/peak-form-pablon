import { Inject, Injectable } from "@nestjs/common";
import { ExerciseVisibility } from "@prisma/client";
import type { UpsertExerciseAsAdminInput } from "@peakform/validation";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import { ExerciseInputValidator } from "../exercise-input-validator";

// PRD 05 §4/§5.3 — Admin authors a GLOBAL exercise directly into the shared
// library (no owner, no promotion needed).
@Injectable()
export class CreateGlobalExerciseUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly validator: ExerciseInputValidator,
  ) {}

  async execute(input: { data: UpsertExerciseAsAdminInput }) {
    await this.validator.validate(input.data);
    return this.exercises.create({
      ...input.data,
      mediaUrl: input.data.mediaUrl ?? null,
      visibility: ExerciseVisibility.GLOBAL,
      ownerProfessionalId: null,
    });
  }
}
