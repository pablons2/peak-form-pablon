import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LinkStatus, Role, Specialization } from "@prisma/client";
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserWithProfiles,
} from "../../auth/domain/ports/user.repository.port";
import {
  LINK_REPOSITORY,
  type LinkRepository,
} from "../../relationships/domain/ports/link.repository.port";
import {
  TRAINING_PLAN_REPOSITORY,
  type MesocycleWithTemplates,
  type TrainingPlanRepository,
  type TrainingPlanWithMesocycles,
} from "../domain/ports/training-plan.repository.port";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
  type SessionWithExercises,
} from "../domain/ports/session.repository.port";

// PRD 06 §4 — ownership resolution shared by every Professional-facing
// use-case: a Professional may only act on plans where they're the assigned
// `professionalId` (Admin is unrestricted). Mesocycle/Session rows carry no
// owner of their own, so acting on one walks up to its TrainingPlan via the
// scalar FK chain (Mesocycle.trainingPlanId, Session.mesocycleId) — two
// extra reads per mutating call, simple and explicit rather than
// denormalizing ownership onto every child row.
@Injectable()
export class TrainingPlanAccess {
  constructor(
    @Inject(TRAINING_PLAN_REPOSITORY) private readonly plans: TrainingPlanRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(LINK_REPOSITORY) private readonly links: LinkRepository,
  ) {}

  // PRD 06 §5.1/§5.7 — which Professional a new/cloned concrete plan gets
  // assigned to. A Professional caller may only ever assign themselves, and
  // only for a Client they hold an ACTIVE PERSONAL_TRAINER link with. An
  // Admin caller must name the professionalId explicitly — Admin isn't
  // itself a Personal Trainer, so there's no implicit "self" to fall back
  // to, and no ACTIVE-link requirement (administrative override).
  async resolveProfessionalForClient(
    actor: UserWithProfiles,
    clientId: string,
    explicitProfessionalId?: string,
  ): Promise<string> {
    if (actor.role === Role.ADMIN) {
      if (!explicitProfessionalId) {
        throw new BadRequestException(
          "professionalId is required when an admin assigns a training plan",
        );
      }
      const professional = await this.users.findById(explicitProfessionalId);
      if (
        !professional ||
        professional.role !== Role.PROFESSIONAL ||
        !professional.professionalProfile?.specializations.includes(
          Specialization.PERSONAL_TRAINER,
        )
      ) {
        throw new BadRequestException(
          "professionalId must belong to a Personal Trainer",
        );
      }
      return professional.id;
    }

    const ownLinks = await this.links.listForProfessional(actor.id);
    const linked = ownLinks.some(
      (l) =>
        l.clientId === clientId &&
        l.status === LinkStatus.ACTIVE &&
        l.specialization === Specialization.PERSONAL_TRAINER,
    );
    if (!linked) {
      throw new ForbiddenException(
        "You can only assign training plans to your own linked clients",
      );
    }
    return actor.id;
  }

  // A concrete plan is owned via `professionalId`; a Starter Template (no
  // Client, §5.8) is owned via `authoredById` instead — exactly one of the
  // two is ever set (PRD 06 §6), so this checks whichever applies.
  assertProfessionalOwnsPlan(
    plan: TrainingPlanWithMesocycles,
    actor: UserWithProfiles,
  ): void {
    if (actor.role === Role.ADMIN) return;
    const ownerId = plan.isStarterTemplate ? plan.authoredById : plan.professionalId;
    if (ownerId !== actor.id) {
      throw new ForbiddenException(
        "You can only manage your own clients' training plans",
      );
    }
  }

  // §4 — "View a plan: Admin, own Professional, own Client (read-only)".
  // 404s rather than 403s on a non-owner, same "existence stays
  // unobservable" pattern PRD 05 uses for invisible PRIVATE exercises.
  assertCanView(plan: TrainingPlanWithMesocycles, viewer: UserWithProfiles): void {
    if (plan.isStarterTemplate || viewer.role === Role.ADMIN) return;
    const owns =
      viewer.role === Role.CLIENT
        ? plan.clientId === viewer.id
        : plan.professionalId === viewer.id;
    if (!owns) throw new NotFoundException("Training plan not found");
  }

  async requirePlan(planId: string): Promise<TrainingPlanWithMesocycles> {
    const plan = await this.plans.findById(planId);
    if (!plan) throw new NotFoundException("Training plan not found");
    return plan;
  }

  async requirePlanForMesocycle(
    mesocycleId: string,
  ): Promise<{ mesocycle: MesocycleWithTemplates; plan: TrainingPlanWithMesocycles }> {
    const mesocycle = await this.plans.findMesocycleById(mesocycleId);
    if (!mesocycle) throw new NotFoundException("Mesocycle not found");
    const plan = await this.requirePlan(mesocycle.trainingPlanId);
    return { mesocycle, plan };
  }

  async requirePlanForSession(sessionId: string): Promise<{
    session: SessionWithExercises;
    mesocycle: MesocycleWithTemplates;
    plan: TrainingPlanWithMesocycles;
  }> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new NotFoundException("Session not found");
    const { mesocycle, plan } = await this.requirePlanForMesocycle(session.mesocycleId);
    return { session, mesocycle, plan };
  }
}
