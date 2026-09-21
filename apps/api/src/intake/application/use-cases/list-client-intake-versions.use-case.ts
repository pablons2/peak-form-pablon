import { Inject, Injectable } from "@nestjs/common";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";
import { IntakeAccess } from "../intake-access.service";

// PRD 03 §5.3/§5.4 — full version history for the Professional's review
// screen (drafts included, labeled by status; the client's own annotations
// history is what proves an intake was versioned rather than edited in
// place).
@Injectable()
export class ListClientIntakeVersionsUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
    private readonly access: IntakeAccess,
  ) {}

  async execute(input: { professionalId: string; clientId: string }) {
    await this.access.assertProfessionalLinkedToClient(
      input.professionalId,
      input.clientId,
    );
    return this.intakes.listVersionsForClient(input.clientId);
  }
}
