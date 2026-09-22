import { Inject, Injectable } from "@nestjs/common";
import { BodyAssessmentSource, type BodyAssessment } from "@prisma/client";
import type { CreateSelfLogInput } from "@peakform/validation";
import {
  BODY_ASSESSMENT_REPOSITORY,
  type BodyAssessmentRepository,
} from "../../domain/ports/body-assessment.repository.port";

// PRD 04 §5.1 — Client-only quick self-log: weight required, everything
// else optional, no `validatedBy`/protocol fields (those only ever apply to
// a professional_validated row).
@Injectable()
export class CreateSelfLogUseCase {
  constructor(
    @Inject(BODY_ASSESSMENT_REPOSITORY)
    private readonly repo: BodyAssessmentRepository,
  ) {}

  execute(input: {
    clientId: string;
    data: CreateSelfLogInput;
  }): Promise<BodyAssessment> {
    return this.repo.create({
      clientId: input.clientId,
      source: BodyAssessmentSource.SELF_REPORTED,
      weight: input.data.weight,
      note: input.data.note ?? null,
      photos: input.data.photoKey
        ? [{ key: input.data.photoKey, tag: "PROGRESS" }]
        : null,
    });
  }
}
