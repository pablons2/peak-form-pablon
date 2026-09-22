"use client";

// PRD 04 §5.5 — side-by-side, date-selectable photo comparison. Progress
// photos (self-log or formal) are compared separately from
// posture-screening photos (different capture framing/purpose, §5.5).
import { useState } from "react";
import type { PublicBodyAssessment } from "../api-client";

interface DatedPhoto {
  recordedAt: string;
  source: PublicBodyAssessment["source"];
  url: string;
}

function extractPhotos(
  entries: PublicBodyAssessment[],
  tag: "PROGRESS" | "POSTURE",
): DatedPhoto[] {
  return entries
    .flatMap((e) =>
      e.photos
        .filter((p) => p.tag === tag)
        .map((p) => ({ recordedAt: e.recordedAt, source: e.source, url: p.url })),
    )
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

function DateSelect({
  photos,
  value,
  onChange,
  label,
}: {
  photos: DatedPhoto[];
  value: number;
  onChange: (i: number) => void;
  label: string;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {photos.map((p, i) => (
          <option key={p.recordedAt} value={i}>
            {new Date(p.recordedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </option>
        ))}
      </select>
    </label>
  );
}

function ComparisonRow({ photos }: { photos: DatedPhoto[] }) {
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(photos.length - 1, 0));

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma foto registrada ainda.</p>;
  }

  const left = photos[leftIdx];
  const right = photos[rightIdx];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <DateSelect photos={photos} value={leftIdx} onChange={setLeftIdx} label="Antes" />
        {left ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={left.url} alt="Foto anterior" className="w-full rounded-md border border-border" />
        ) : null}
      </div>
      <div className="space-y-1">
        <DateSelect photos={photos} value={rightIdx} onChange={setRightIdx} label="Depois" />
        {right ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={right.url} alt="Foto mais recente" className="w-full rounded-md border border-border" />
        ) : null}
      </div>
    </div>
  );
}

export function PhotoComparison({ entries }: { entries: PublicBodyAssessment[] }) {
  const progress = extractPhotos(entries, "PROGRESS");
  const posture = extractPhotos(entries, "POSTURE");

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-foreground">Fotos de progresso</h3>
        <div className="mt-2">
          <ComparisonRow photos={progress} />
        </div>
      </section>
      <section>
        <h3 className="text-sm font-medium text-foreground">Fotos de avaliação postural</h3>
        <div className="mt-2">
          <ComparisonRow photos={posture} />
        </div>
      </section>
    </div>
  );
}
