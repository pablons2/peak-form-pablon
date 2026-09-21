import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import type { UpdateIntakeInput } from "@peakform/validation";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";

// PRD 03 §5.1 — autosave for the multi-step questionnaire (readiness /
// body-map / conditions / availability / equipment). Only the owning Client
// may edit their own draft, and only while it's still IN_PROGRESS — a
// finalized (COMPLETED/SKIPPED) version is immutable per §5.3, editing means
// starting a new version instead.
@Injectable()
export class UpdateIntakeUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
  ) {}

  async execute(input: {
    clientId: string;
    intakeAssessmentId: string;
    data: UpdateIntakeInput;
  }) {
    const intake = await this.intakes.findById(input.intakeAssessmentId);
    if (!intake) throw new NotFoundException("Intake assessment not found");
    if (intake.clientId !== input.clientId) {
      throw new ForbiddenException("This is not your intake assessment");
    }
    if (intake.status !== IntakeStatus.IN_PROGRESS) {
      throw new ConflictException(
        "This intake is already finalized — start a new version to make changes",
      );
    }

    // parqAnswers is a Json map, not a relation — a Prisma update replaces
    // it wholesale, so a step that answers one question at a time (or
    // revises a single answer) must be merged onto the existing answers here
    // rather than overwriting them. painFlags/availability/equipmentAccess
    // are deliberately NOT merged: painFlags is a full "set" replace (same
    // semantics PRD 05 uses for Exercise.contraindicationTags — a write that
    // omits a region must actually remove it), and availability/
    // equipmentAccess are each a single coherent object the caller always
    // submits in full.
    const data = input.data.parqAnswers
      ? {
          ...input.data,
          parqAnswers: {
            ...((intake.parqAnswers as Record<string, boolean> | null) ?? {}),
            ...input.data.parqAnswers,
          },
        }
      : input.data;

    return this.intakes.update(intake.id, data);
  }
}
