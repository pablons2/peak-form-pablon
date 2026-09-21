import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";
import { IntakeAccess } from "../intake-access.service";

// PRD 03 §5.4 — a clinical annotation tied to one specific intake version,
// independent of the Client-authored fields and never overwritten by the
// Client's next self-reported update (that update lands on a new version
// row entirely). Any of the Professional's own finalized-or-draft versions
// for a linked Client can be annotated — most often the latest one.
@Injectable()
export class AddProfessionalAnnotationUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
    private readonly access: IntakeAccess,
  ) {}

  async execute(input: {
    professionalId: string;
    intakeAssessmentId: string;
    note: string;
  }) {
    const intake = await this.intakes.findById(input.intakeAssessmentId);
    if (!intake) throw new NotFoundException("Intake assessment not found");
    await this.access.assertProfessionalLinkedToClient(
      input.professionalId,
      intake.clientId,
    );
    return this.intakes.addAnnotation(intake.id, input.professionalId, input.note);
  }
}
