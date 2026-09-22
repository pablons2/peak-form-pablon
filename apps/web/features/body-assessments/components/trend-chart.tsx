// PRD 04 §5.5 — weight/measurement trend charts, source-distinguished, with
// a protocol-version-change annotation. No charting library is installed in
// this repo and the rest of the codebase prefers hand-rolled UI over a new
// dependency where one isn't load-bearing (no modal library, no RHF for
// nested arrays) — this is a small enough shape (a scatter/line over a
// single numeric series) that a plain inline SVG is simpler than adopting
// and theming a charting library for one screen.
export interface TrendPoint {
  recordedAt: string;
  value: number;
  source: "SELF_REPORTED" | "PROFESSIONAL_VALIDATED";
  protocolVersion?: string | null;
}

const WIDTH = 600;
const HEIGHT = 180;
const PAD_X = 36;
const PAD_Y = 20;

export function TrendChart({
  points,
  label,
  unit,
}: {
  points: TrendPoint[];
  label: string;
  unit: string;
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ainda não há {label.toLowerCase()} registrado(a).
      </p>
    );
  }

  const sorted = [...points].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  const times = sorted.map((p) => new Date(p.recordedAt).getTime());
  const values = sorted.map((p) => p.value);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spanT = maxT - minT || 1;
  const spanV = maxV - minV || 1;

  const x = (t: number) => PAD_X + ((t - minT) / spanT) * (WIDTH - 2 * PAD_X);
  const y = (v: number) =>
    HEIGHT - PAD_Y - ((v - minV) / spanV) * (HEIGHT - 2 * PAD_Y);

  const linePath = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(new Date(p.recordedAt).getTime())} ${y(p.value)}`)
    .join(" ");

  // §5.6/§5.5 — flag the first point where protocolVersion differs from the
  // immediately preceding validated point, so a Professional isn't misled
  // by a discontinuity in what the numbers mean.
  const protocolChanges = sorted.filter((p, i) => {
    if (i === 0 || !p.protocolVersion) return false;
    const prevValidated = [...sorted.slice(0, i)]
      .reverse()
      .find((q) => q.protocolVersion);
    return prevValidated && prevValidated.protocolVersion !== p.protocolVersion;
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Gráfico de tendência de ${label}`}
        className="w-full text-foreground"
      >
        <line
          x1={PAD_X}
          y1={HEIGHT - PAD_Y}
          x2={WIDTH - PAD_X}
          y2={HEIGHT - PAD_Y}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        <path d={linePath} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} />
        {protocolChanges.map((p) => (
          <line
            key={`protocol-${p.recordedAt}`}
            x1={x(new Date(p.recordedAt).getTime())}
            x2={x(new Date(p.recordedAt).getTime())}
            y1={PAD_Y}
            y2={HEIGHT - PAD_Y}
            stroke="currentColor"
            strokeDasharray="3,3"
            strokeOpacity={0.5}
          />
        ))}
        {sorted.map((p) => (
          <circle
            key={p.recordedAt}
            cx={x(new Date(p.recordedAt).getTime())}
            cy={y(p.value)}
            r={4}
            className={
              p.source === "PROFESSIONAL_VALIDATED"
                ? "fill-primary"
                : "fill-muted-foreground"
            }
          >
            <title>
              {new Date(p.recordedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}: {p.value}
              {unit} ({p.source === "PROFESSIONAL_VALIDATED" ? "validado" : "auto-relatado"})
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Validado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" /> Auto-relatado
        </span>
        {protocolChanges.length > 0 ? (
          <span>· linha tracejada = mudança de protocolo</span>
        ) : null}
      </div>
    </div>
  );
}
