import { Inject, Injectable } from "@nestjs/common";
import type { BodyAssessment } from "@prisma/client";
import {
  BODY_ASSESSMENT_REPOSITORY,
  type BodyAssessmentRepository,
} from "../../domain/ports/body-assessment.repository.port";

// PRD 04 §4 — a Client's own full timeline (self-reported + validated),
// chronological (§5.4/§5.5).
@Injectable()
export class ListMyBodyAssessmentsUseCase {
  constructor(
    @Inject(BODY_ASSESSMENT_REPOSITORY)
    private readonly repo: BodyAssessmentRepository,
  ) {}

  execute(input: { clientId: string }): Promise<BodyAssessment[]> {
    return this.repo.listForClient(input.clientId);
  }
}
