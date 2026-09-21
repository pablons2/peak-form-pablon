import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import { PARQ_QUESTION_CODES, type ParqAnswers } from "../../domain/par-q-questions";
import { mapIntakeToContraindicationTags } from "../../domain/map-intake-to-contraindication-tags";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";

// PRD 03 §5.1/§5.2 — finalizes a draft into COMPLETED. Requires every
// readiness (PAR-Q) question to have been answered — the minimum
// completeness bar for a "structured questionnaire" (§5.1); the body-map,
// conditions, availability and equipment sections are all optional (a Client
// with no injuries legitimately has nothing to flag). Derives the
// contraindications profile via the Domain-layer rule set at this exact
// moment, per §5.2.
@Injectable()
export class CompleteIntakeUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
  ) {}

  async execute(input: { clientId: string; intakeAssessmentId: string }) {
    const intake = await this.intakes.findById(input.intakeAssessmentId);
    if (!intake) throw new NotFoundException("Intake assessment not found");
    if (intake.clientId !== input.clientId) {
      throw new ForbiddenException("This is not your intake assessment");
    }
    if (intake.status !== IntakeStatus.IN_PROGRESS) {
      throw new ConflictException("This intake is already finalized");
    }

    const parqAnswers = (intake.parqAnswers ?? {}) as ParqAnswers;
    const unanswered = PARQ_QUESTION_CODES.filter((code) => !(code in parqAnswers));
    if (unanswered.length > 0) {
      throw new BadRequestException(
        `Answer every readiness question before completing (missing: ${unanswered.join(", ")})`,
      );
    }

    const contraindicationTagCodes = mapIntakeToContraindicationTags({
      parqAnswers,
      painFlags: intake.painFlags,
      medicalConditions: intake.medicalConditions,
    });

    return this.intakes.update(intake.id, {
      status: IntakeStatus.COMPLETED,
      completedAt: new Date(),
      contraindicationTagCodes,
    });
  }
}
