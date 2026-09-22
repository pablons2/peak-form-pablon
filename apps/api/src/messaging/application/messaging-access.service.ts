import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MessageThreadStatus, Role } from "@prisma/client";
import type { MessageThreadWithParties } from "../domain/ports/messaging.repository.port";

// PRD 11 §4/§10 — "No user can read or send messages in a thread they are
// not a party to, enforced server-side." A thread's own professionalId/
// clientId columns are sufficient for party membership — no need to
// re-query PRD 02's LINK_REPOSITORY, since the thread row IS the durable
// record of who the two parties are (kept in sync with the link's status,
// not re-derived from it on every request). 404s on a non-party, not 403,
// matching this codebase's "existence stays unobservable" precedent
// (TrainingPlanAccess.assertCanView, IntakeAccess, BodyAssessmentAccess).
//
// Admin gets read-only "support" access per §4's table (row "Read/moderate
// any thread: Admin ✅") — but the *other* row ("Send/read messages in own
// thread") has no Admin column entry at all, so Admin may never write.
@Injectable()
export class MessagingAccess {
  assertCanRead(
    thread: MessageThreadWithParties,
    actor: { id: string; role: Role },
  ): void {
    if (actor.role === Role.ADMIN) return;
    if (actor.id !== thread.professionalId && actor.id !== thread.clientId) {
      throw new NotFoundException("Thread not found");
    }
  }

  assertCanWrite(
    thread: MessageThreadWithParties,
    actor: { id: string; role: Role },
  ): void {
    if (actor.role === Role.ADMIN) {
      throw new ForbiddenException("Admin access to messaging is read-only support");
    }
    if (actor.id !== thread.professionalId && actor.id !== thread.clientId) {
      throw new NotFoundException("Thread not found");
    }
    if (thread.status !== MessageThreadStatus.ACTIVE) {
      throw new ForbiddenException(
        "This relationship has ended — the thread is read-only",
      );
    }
  }
}
