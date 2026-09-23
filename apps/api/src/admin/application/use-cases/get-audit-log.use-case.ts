import { Injectable } from "@nestjs/common";
import type { AdminAuditLogQuery } from "@peakform/validation";
import { AuditLogService } from "../../../shared/audit-log/audit-log.service";

// PRD 13 §5.5 — filterable, read-only audit log view.
@Injectable()
export class GetAuditLogUseCase {
  constructor(private readonly auditLog: AuditLogService) {}

  execute(filters: AdminAuditLogQuery) {
    return this.auditLog.list(filters);
  }
}
