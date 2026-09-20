import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  CONTRAINDICATION_TAG_REPOSITORY,
  type ContraindicationTagRepository,
} from "../domain/ports/contraindication-tag.repository.port";
import type { ExerciseWriteData } from "../domain/ports/exercise.repository.port";

// Shared write-path validation for exercises: every referenced
// contraindication code must exist in the module-owned vocabulary (PRD 05 §6).
// Kept as an Application-layer collaborator so create/update/promote-adjacent
// use-cases don't each re-implement the check.
@Injectable()
export class ExerciseInputValidator {
  constructor(
    @Inject(CONTRAINDICATION_TAG_REPOSITORY)
    private readonly tags: ContraindicationTagRepository,
  ) {}

  async validate(data: ExerciseWriteData): Promise<void> {
    if (!data.contraindicationCodes || data.contraindicationCodes.length === 0) {
      return;
    }
    const existing = await this.tags.existingCodes(data.contraindicationCodes);
    const unknown = data.contraindicationCodes.filter((c) => !existing.has(c));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown contraindication tag(s): ${unknown.join(", ")}`,
      );
    }
  }
}
