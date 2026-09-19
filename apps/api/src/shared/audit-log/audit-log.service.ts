import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface AuditLogEntry {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

// Append-only writer for the shared AuditLog table (base doc §6/§9). First
// consumer is PRD 01 §5.6 (approval/rejection); later modules (PRD 02
// force-unlink, PRD 06 contraindication overrides, PRD 13 admin actions)
// reuse this same service rather than each owning their own log.
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        // Round-trip through JSON to strip `undefined` values (e.g. an
        // omitted optional field) — Prisma's Json input rejects those even
        // though `Record<string, unknown>` allows them.
        metadata: entry.metadata
          ? (JSON.parse(JSON.stringify(entry.metadata)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
