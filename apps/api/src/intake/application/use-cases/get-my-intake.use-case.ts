import { Inject, Injectable } from "@nestjs/common";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";
import { IntakeGatingService } from "../intake-gating.service";

// PRD 03 §4/§5.3 — a Client's own latest intake version (draft or
// finalized), plus the gating flag PRD 06 will consume, so the frontend can
// show "you need to complete/skip your intake before a plan can be built"
// without a second round trip.
@Injectable()
export class GetMyIntakeUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
    private readonly gating: IntakeGatingService,
  ) {}

  async execute(input: { clientId: string }) {
    const versions = await this.intakes.listVersionsForClient(input.clientId);
    return {
      intake: versions[0] ?? null,
      planAssignmentAllowed: await this.gating.isPlanAssignmentAllowed(input.clientId),
    };
  }
}
