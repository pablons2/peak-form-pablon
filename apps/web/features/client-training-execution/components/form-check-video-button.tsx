// PRD 07 §5.5 — visibly present, disabled, "coming soon" affordance. No
// backend call exists behind this at all (base doc decision 3.5) — this
// element performs no action beyond rendering, ever, in v1.
export function FormCheckVideoButton() {
  return (
    <button
      type="button"
      disabled
      title="Em breve"
      aria-disabled="true"
      className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground opacity-60"
    >
      🎥 Gravar vídeo de execução
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
        Em breve
      </span>
    </button>
  );
}
