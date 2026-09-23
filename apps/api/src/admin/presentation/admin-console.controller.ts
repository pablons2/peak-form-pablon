import { Controller, Get, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  adminAuditLogQuerySchema,
  type AdminAuditLogQuery,
} from "@peakform/validation";
import { CurrentUser } from "../../auth/presentation/decorators/current-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { UserWithProfiles } from "../../auth/domain/ports/user.repository.port";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import { GetAdminAnalyticsUseCase } from "../application/use-cases/get-admin-analytics.use-case";
import { GetAuditLogUseCase } from "../application/use-cases/get-audit-log.use-case";

// PRD 13 §5.5/§5.6 — the audit log viewer and the aggregate analytics
// dashboard. This controller adds no write route onto AuditLog at all —
// "append-only, not editable/deletable from this console" (§5.5/§10) holds
// structurally, not by a runtime check. The other Admin Console surfaces
// (user list/deactivate/reactivate + approval queue, exercise curation,
// relationship force-unlink) already live in their owning modules'
// controllers — see admin-users.controller.ts's own note.
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminConsoleController {
  constructor(
    private readonly getAuditLog: GetAuditLogUseCase,
    private readonly getAnalytics: GetAdminAnalyticsUseCase,
  ) {}

  @Get("audit-log")
  auditLogHandler(
    @Query(new ZodValidationPipe(adminAuditLogQuerySchema))
    query: AdminAuditLogQuery,
  ) {
    return this.getAuditLog.execute(query);
  }

  @Get("analytics")
  analyticsHandler(@CurrentUser() admin: UserWithProfiles) {
    return this.getAnalytics.execute({ adminId: admin.id, now: new Date() });
  }
}
