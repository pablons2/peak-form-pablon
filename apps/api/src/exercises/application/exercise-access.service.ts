import { Inject, Injectable } from "@nestjs/common";
import { LinkStatus, Role } from "@prisma/client";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../relationships/domain/ports/link.repository.port";
import type {
  ExerciseVisibilityScope,
  ExerciseWithTags,
} from "../domain/ports/exercise.repository.port";

// PRD 05 §4/§5.3 — who can see which exercises. GLOBAL records are visible to
// every authenticated role; a PRIVATE custom exercise is visible to its owner
// and to Clients currently linked to that owner ("their own account/clients").
// Admins see everything (curation duty). Resolved here once per request so
// each use-case doesn't re-derive the rule.
@Injectable()
export class ExerciseAccess {
  constructor(
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  async scopeFor(viewer: {
    id: string;
    role: Role;
  }): Promise<ExerciseVisibilityScope> {
    if (viewer.role === Role.ADMIN) {
      return { unrestricted: true, privateOwnerIds: [] };
    }
    if (viewer.role === Role.PROFESSIONAL) {
      return { privateOwnerIds: [viewer.id] };
    }
    const links = await this.links.listForClient(viewer.id);
    const professionalIds = links
      .filter((l) => l.status === LinkStatus.ACTIVE)
      .map((l) => l.professionalId);
    return { privateOwnerIds: [...new Set(professionalIds)] };
  }

  canView(scope: ExerciseVisibilityScope, exercise: ExerciseWithTags): boolean {
    if (scope.unrestricted) return true;
    if (exercise.visibility === "GLOBAL") return true;
    return (
      exercise.ownerProfessionalId != null &&
      scope.privateOwnerIds.includes(exercise.ownerProfessionalId)
    );
  }
}
