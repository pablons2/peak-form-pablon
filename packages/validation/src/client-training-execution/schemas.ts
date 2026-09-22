// PRD 07 — Client Training Execution input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// §5.2 — actualReps is the one field every logged set genuinely needs;
// actualLoad/actualRpeOrRir stay nullable the same way SessionExercise's own
// targetLoad/targetRpe/targetRir are (a bodyweight set has no load, and
// which of RPE/RIR applies — or neither — is whatever the prescription
// used).
export const logSetSchema = z.object({
  actualReps: z.number().int().min(0).max(200),
  actualLoad: z.number().min(0).max(1000).nullable().optional(),
  actualRpeOrRir: z.number().min(0).max(10).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type LogSetInput = z.infer<typeof logSetSchema>;
