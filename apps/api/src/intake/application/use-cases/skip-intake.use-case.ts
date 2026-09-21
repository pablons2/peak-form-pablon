import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import type { ParqAnswers } from "../../domain/par-q-questions";
import { mapIntakeToContraindicationTags } from "../../domain/map-intake-to-contraindication-tags";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";

// PRD 03 §5.3 — "Skip requires the Client to read and check an explicit risk
// disclaimer before the skip is recorded — this is a deliberate friction
// point, not a silent bypass." The acknowledgement itself is enforced by the
// controller's zod schema (skipIntakeSchema requires `acknowledged: true`
// literally) before this use-case ever runs. Whatever partial data the
// Client already entered (e.g. a flagged current injury before abandoning
// the rest of the form) still gets mapped to contraindication tags — a
// partially-answered safety flag is still a safety flag.
@Injectable()
export class SkipIntakeUseCase {
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

    const contraindicationTagCodes = mapIntakeToContraindicationTags({
      parqAnswers: (intake.parqAnswers ?? {}) as ParqAnswers,
      painFlags: intake.painFlags,
      medicalConditions: intake.medicalConditions,
    });

    return this.intakes.update(intake.id, {
      status: IntakeStatus.SKIPPED_WITH_ACKNOWLEDGEMENT,
      completedAt: new Date(),
      contraindicationTagCodes,
    });
  }
}
