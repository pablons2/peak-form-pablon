import { Injectable, NotFoundException } from "@nestjs/common";

// PRD 10 §4/§10 — this module has no "own linked client" concept at all
// (unlike NutritionAccess/MessagingAccess): a habit/task's own `clientId`
// column IS the whole authorization surface, and every repository read is
// already scoped by (id, clientId) — see productivity.repository.port.ts.
// This service exists purely to turn "the scoped lookup came back null"
// into the same existence-hiding 404 the rest of the codebase uses
// (TrainingPlanAccess, MessagingAccess, ...): a Client probing another
// Client's habit/task id can't distinguish "doesn't exist" from "exists
// but isn't yours."
@Injectable()
export class ProductivityAccess {
  assertOwns<T>(entity: T | null, notFoundMessage: string): T {
    if (!entity) throw new NotFoundException(notFoundMessage);
    return entity;
  }
}
