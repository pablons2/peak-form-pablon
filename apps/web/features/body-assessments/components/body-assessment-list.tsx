import { SourceBadge } from "./source-badge";
import type { PublicBodyAssessment } from "../api-client";

// PRD 04 §5.4/§5.5 — the append-only chronological timeline, newest first
// for scanning; every entry always shows the self-reported/validated badge
// (§7).
export function BodyAssessmentList({ entries }: { entries: PublicBodyAssessment[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
    );
  }
  const newestFirst = [...entries].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );

  return (
    <ul className="divide-y divide-border">
      {newestFirst.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
          <div>
            <span className="font-medium text-foreground">
              {new Date(entry.recordedAt).toLocaleDateString("pt-BR")}
            </span>{" "}
            <span className="text-muted-foreground">— {entry.weight} kg</span>
            {entry.bodyFatPercent != null ? (
              <span className="text-muted-foreground">
                {" "}
                · {entry.bodyFatPercent}% gordura
                {entry.bodyFatSource === "MANUAL_OVERRIDE" ? " (manual)" : ""}
              </span>
            ) : null}
          </div>
          <SourceBadge source={entry.source} />
        </li>
      ))}
    </ul>
  );
}
