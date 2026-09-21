import { Inject, Injectable } from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../../domain/ports/intake.repository.port";
import { IntakeAccess } from "../intake-access.service";

// PRD 03 §4/§5.4 — a Professional's review of their own linked Client's
// intake: the latest *finalized* version (a bare in-progress draft isn't
// useful to review yet), its contraindication tags and any prior
// annotations. Returns null rather than 404 when the Client hasn't finalized
// one yet, so the review screen can render "waiting on the client" instead
// of an error.
@Injectable()
export class GetClientIntakeUseCase {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
    private readonly access: IntakeAccess,
  ) {}

  async execute(input: { professionalId: string; clientId: string }) {
    await this.access.assertProfessionalLinkedToClient(
      input.professionalId,
      input.clientId,
    );
    const versions = await this.intakes.listVersionsForClient(input.clientId);
    const latestFinalized =
      versions.find(
        (v) =>
          v.status === IntakeStatus.COMPLETED ||
          v.status === IntakeStatus.SKIPPED_WITH_ACKNOWLEDGEMENT,
      ) ?? null;
    return {
      intake: latestFinalized,
      planAssignmentAllowed: latestFinalized !== null,
    };
  }
}
