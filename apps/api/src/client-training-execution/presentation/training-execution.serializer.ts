import type { SessionExecutionView } from "../application/session-execution-composer.service";

// Passes the composed view through as-is — it's already shaped for the
// client, no field ever needs hiding (unlike PRD 03's Client/Professional
// serializer split, this module has no data a linked party shouldn't see).
export function toPublicSessionExecution(view: SessionExecutionView) {
  return view;
}
