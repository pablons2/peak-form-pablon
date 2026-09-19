// PRD 02 — Professional ↔ Client Relationship input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";
import { specializationSchema } from "../auth/schemas";

const emailSchema = z.string().trim().toLowerCase().email();

// Free-text note shown to the Client on a check-in (PRD 02 §5.6).
const noteSchema = z.string().trim().max(500);

// PRD 02 §5.1 — an APPROVED Professional invites a Client by email, per
// specialization (a Professional holding both specializations may send one
// invite covering both, or two separate invites).
export const inviteClientSchema = z.object({
  clientEmail: emailSchema,
  specializations: z.array(specializationSchema).min(1).max(2),
});
export type InviteClientInput = z.infer<typeof inviteClientSchema>;

// PRD 02 §5.2 — Client-initiated request: the Client names a Professional's
// email and which specialization they want; the Professional must accept.
export const requestProfessionalSchema = z.object({
  professionalEmail: emailSchema,
  specialization: specializationSchema,
});
export type RequestProfessionalInput = z.infer<typeof requestProfessionalSchema>;

// PRD 02 §5.6 — ONE_OFF carries a dueDate; RECURRING carries cadence + anchor
// (weekday 0-6 for WEEKLY/BIWEEKLY, day-of-month 1-31 for MONTHLY — the
// per-cadence range is enforced in the Application layer where the type is
// known together with the anchor).
export const createCheckInScheduleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ONE_OFF"),
    dueDate: z.coerce.date(),
    note: noteSchema.optional(),
  }),
  z.object({
    type: z.literal("RECURRING"),
    cadence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
    anchor: z.number().int(),
    note: noteSchema.optional(),
  }),
]);
export type CreateCheckInScheduleInput = z.infer<
  typeof createCheckInScheduleSchema
>;

export const updateCheckInScheduleSchema = z.object({
  dueDate: z.coerce.date().optional(),
  cadence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  anchor: z.number().int().optional(),
  note: noteSchema.optional(),
});
export type UpdateCheckInScheduleInput = z.infer<
  typeof updateCheckInScheduleSchema
>;
