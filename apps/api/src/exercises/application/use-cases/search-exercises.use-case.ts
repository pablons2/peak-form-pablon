import { Inject, Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  EXERCISE_REPOSITORY,
  type ExerciseRepository,
  type ExerciseSearchFilters,
} from "../../domain/ports/exercise.repository.port";
import type { UserWithProfiles } from "../../../auth/domain/ports/user.repository.port";
import { ExerciseAccess } from "../exercise-access.service";

// PRD 05 §5.4 — browse/search the catalog. One endpoint serves the library
// screen and (later) PRD 06's exercise picker; visibility scoping happens
// here so a PRIVATE custom never leaks into another account's results.
// `mine` narrows to the caller's own authored customs (Professionals/Admins —
// a Client can't author, so they get an empty list rather than an error).
@Injectable()
export class SearchExercisesUseCase {
  constructor(
    @Inject(EXERCISE_REPOSITORY)
    private readonly exercises: ExerciseRepository,
    private readonly access: ExerciseAccess,
  ) {}

  async execute(input: {
    viewer: UserWithProfiles;
    filters: ExerciseSearchFilters & { mine?: boolean };
  }) {
    const scope = await this.access.scopeFor(input.viewer);
    const filters = { ...input.filters };
    delete filters.mine;
    if (input.filters.mine) {
      if (input.viewer.role === Role.CLIENT) return [];
      filters.ownerId = input.viewer.id;
    }
    return this.exercises.search(scope, filters);
  }
}
