import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
} from "../../exercises/domain/ports/exercise.repository.port";

// Every exerciseId referenced by a weekly-template or session-exercise write
// must exist — checked explicitly here so a typo/stale id surfaces as a
// clean 400 instead of a raw FK-violation 500 from the eventual insert.
@Injectable()
export class ValidateExerciseIds {
  constructor(
    @Inject(EXERCISE_REPOSITORY) private readonly exercises: ExerciseRepository,
  ) {}

  async execute(exerciseIds: string[]): Promise<void> {
    const unique = [...new Set(exerciseIds)];
    for (const id of unique) {
      const exercise = await this.exercises.findById(id);
      if (!exercise) {
        throw new BadRequestException(`Unknown exercise: ${id}`);
      }
    }
  }
}
