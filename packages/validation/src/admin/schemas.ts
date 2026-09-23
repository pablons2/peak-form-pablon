// PRD 13 — Admin Console input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// Mirrors the Prisma Role/UserStatus enums (same pattern as
// specializationSchema ↔ Specialization elsewhere in this package).
const roleSchema = z.enum(["ADMIN", "PROFESSIONAL", "CLIENT"]);
const userStatusSchema = z.enum(["ACTIVE", "DEACTIVATED"]);

// PRD 13 §5.1 — list/search Users; every field optional so the bare
// `GET /admin/users` returns everyone.
export const adminListUsersQuerySchema = z.object({
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  q: z.string().trim().max(200).optional(),
});
export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

// PRD 13 §5.5 — audit log filters (actor, action type, entity, date range).
// Read-only by construction: this package defines no update/delete schema
// for AuditLog anywhere, matching the "append-only" requirement.
export const adminAuditLogQuerySchema = z
  .object({
    actorId: z.string().trim().min(1).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    entity: z.string().trim().min(1).max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "from must be before to",
    path: ["from"],
  });
export type AdminAuditLogQuery = z.infer<typeof adminAuditLogQuerySchema>;
