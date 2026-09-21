import { Inject, Injectable } from "@nestjs/common";
import { IntakeStatus } from "@prisma/client";
import {
  INTAKE_REPOSITORY,
  type IntakeRepository,
} from "../domain/ports/intake.repository.port";

// PRD 03 §5.3 — "A Client cannot have a TrainingPlan assigned to them (PRD
// 06) until their intake status is COMPLETED or
// SKIPPED_WITH_ACKNOWLEDGEMENT." Starting a new draft after a prior version
// was finalized does NOT re-gate the client — the prior finalized data still
// stands until the new version itself is finalized — so this checks "has the
// Client ever finalized a version", not just the latest row's status.
// Exported from IntakeModule so PRD 06's plan-creation use-case can call this
// directly (in-process), the same cross-module pattern as PRD 02's
// LINK_REPOSITORY export.
@Injectable()
export class IntakeGatingService {
  constructor(
    @Inject(INTAKE_REPOSITORY) private readonly intakes: IntakeRepository,
  ) {}

  async isPlanAssignmentAllowed(clientId: string): Promise<boolean> {
    const versions = await this.intakes.listVersionsForClient(clientId);
    return versions.some(
      (v) =>
        v.status === IntakeStatus.COMPLETED ||
        v.status === IntakeStatus.SKIPPED_WITH_ACKNOWLEDGEMENT,
    );
  }

  // PRD 06 §5.6 — the contraindications profile PRD 06's exercise picker
  // cross-references. "Current" is the latest *finalized* version, same
  // definition isPlanAssignmentAllowed uses — an abandoned newer IN_PROGRESS
  // draft must not blank out a still-valid prior profile.
  async getContraindicationTagCodes(clientId: string): Promise<string[]> {
    const versions = await this.intakes.listVersionsForClient(clientId);
    const latestFinalized = versions.find(
      (v) =>
        v.status === IntakeStatus.COMPLETED ||
        v.status === IntakeStatus.SKIPPED_WITH_ACKNOWLEDGEMENT,
    );
    return latestFinalized?.contraindicationTagCodes ?? [];
  }
}
