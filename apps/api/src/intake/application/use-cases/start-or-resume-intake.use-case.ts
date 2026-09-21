import { Inject, Injectable } from "@nestjs/common";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";

// PRD 03 §5.1 — starts a new intake version, or resumes the Client's current
// IN_PROGRESS draft if one already exists (idempotent: re-opening the intake
// flow after a page reload must not silently create a second draft).
@Injectable()
export class StartOrResumeIntakeUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
  ) {}

  async execute(input: { clientId: string }) {
    const draft = await this.intakes.findDraftForClient(input.clientId);
    if (draft) return draft;
    return this.intakes.create({ clientId: input.clientId });
  }
}
