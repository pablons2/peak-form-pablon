import { SOURCE_LABELS } from "../labels";
import type { BodyAssessmentSource } from "../api-client";

// §7 — clear visual distinction between self-reported and
// professional-validated entries everywhere they appear, so nobody mistakes
// an unvalidated self-entry for a clinical record.
export function SourceBadge({ source }: { source: BodyAssessmentSource }) {
  const isValidated = source === "PROFESSIONAL_VALIDATED";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (isValidated
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground")
      }
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}
