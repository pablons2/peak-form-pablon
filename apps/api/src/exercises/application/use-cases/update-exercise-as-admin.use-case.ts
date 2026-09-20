import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { UpdateExerciseInput } from "@peakform/validation";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../domain/ports/exercise.repository.port";
import { ExerciseInputValidator } from "../exercise-input-validator";

// PRD 05 §4 — Admin edits any exercise (global curation or fixing a custom
// before/instead of promoting it). Visibility/ownership are untouched here —
// changing those is PromoteExerciseUseCase's job so every promotion is
// audited.
@Injectable()
export class UpdateExerciseAsAdminUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly validator: ExerciseInputValidator,
  ) {}

  async execute(input: { exerciseId: string; data: UpdateExerciseInput }) {
    const exercise = await this.exercises.findById(input.exerciseId);
    if (!exercise) throw new NotFoundException("Exercise not found");
    await this.validator.validate(input.data);
    return this.exercises.update(exercise.id, input.data);
  }
}
