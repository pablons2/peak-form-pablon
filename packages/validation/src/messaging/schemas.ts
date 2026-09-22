// PRD 11 — Messaging input rules.
// Single source of truth (base doc §7.1/§9): the backend re-validates every
// request against these regardless of what the frontend already checked.
import { z } from "zod";

// §5.2 — plain text only, reasonable length cap (2,000 chars) to keep this a
// chat tool, not a document-sharing tool. Rejected server-side, not just
// truncated client-side.
export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
