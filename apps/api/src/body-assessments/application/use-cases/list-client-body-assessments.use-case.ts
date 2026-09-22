import { Inject, Injectable } from "@nestjs/common";
import type { BodyAssessment } from "@prisma/client";
import {
  BODY_ASSESSMENT_REPOSITORY,
  type BodyAssessmentRepository,
} from "../../domain/ports/body-assessment.repository.port";
import { BodyAssessmentAccess } from "../body-assessment-access.service";

// PRD 04 §4 — a Professional's view of one linked Client's timeline
// (own clients only, any specialization). No Admin equivalent exists here —
// see BodyAssessmentAccess's doc comment for why that asymmetry is
// intentional.
@Injectable()
export class ListClientBodyAssessmentsUseCase {
  constructor(
    @Inject(BODY_ASSESSMENT_REPOSITORY)
    private readonly repo: BodyAssessmentRepository,
    private readonly access: BodyAssessmentAccess,
  ) {}

  async execute(input: {
    professionalId: string;
    clientId: string;
  }): Promise<BodyAssessment[]> {
    await this.access.assertProfessionalLinkedToClient(
      input.professionalId,
      input.clientId,
    );
    return this.repo.listForClient(input.clientId);
  }
}
