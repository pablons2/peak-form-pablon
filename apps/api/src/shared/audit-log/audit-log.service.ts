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

// PRD 13 §5.5 — read-side filters for the Admin Console's log viewer.
export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entity?: string;
  from?: Date;
  to?: Date;
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

  // PRD 13 §5.5 — filterable, read-only view. No update/delete method
  // exists on this service at all: append-only is enforced by this class
  // simply never exposing a write path other than `record`, not by a
  // runtime check.
  list(filters: AuditLogFilters) {
    return this.prisma.auditLog.findMany({
      where: {
        actorId: filters.actorId,
        action: filters.action,
        entity: filters.entity,
        createdAt:
          filters.from || filters.to
            ? { gte: filters.from, lte: filters.to }
            : undefined,
      },
      include: {
        actor: { select: { id: true, email: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      // No pagination UI required by PRD 13 §5.5; a bound keeps this v1
      // single-practice-scale query from ever going unbounded.
      take: 200,
    });
  }
}
