import type { ContraindicationWarning } from "../api-client";

// PRD 06 §5.6/§7 — "contraindication warnings use a persistent, unmissable
// visual treatment (not a toast that disappears)". Rendered as page content
// after a save, not a dismissible/auto-hiding notification.
export function ContraindicationWarnings({
  warnings,
}: {
  warnings: ContraindicationWarning[];
}) {
  if (warnings.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4"
    >
      <p className="text-sm font-semibold text-destructive">
        Aviso de contraindicação
      </p>
      <ul className="mt-2 space-y-1 text-sm text-foreground">
        {warnings.map((w) => (
          <li key={w.exerciseId}>
            Este cliente sinalizou uma condição relacionada a{" "}
            <strong>{w.matchedTags.join(", ")}</strong> — o exercício{" "}
            <strong>{w.exerciseName}</strong> está marcado para essa
            contraindicação.
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        A prescrição foi salva mesmo assim — a decisão clínica é sua.
      </p>
    </div>
  );
}
