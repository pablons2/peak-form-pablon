"use client";

// PRD 03 §5.1/§7 — "interactive body-map picker (front/back silhouette) —
// Client taps a body region, selects pain type/severity (0–10), and whether
// it's past or current. Multiple regions can be flagged." No SVG silhouette
// asset exists in this repo yet, so the picker is a front/back tab of
// large-touch-target region toggles — same interaction model (tap a region,
// then set severity/recency), no drawn body shape. Swappable for an SVG
// overlay later without touching the data shape.
import { useState } from "react";
import type { PainFlagInput } from "@peakform/validation";
import {
  BACK_BODY_REGIONS,
  BODY_REGION_LABELS,
  FRONT_BODY_REGIONS,
} from "../labels";

const regionButtonClass = (active: boolean) =>
  `min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-muted"
  }`;

export function BodyMapPicker({
  painFlags,
  onChange,
}: {
  painFlags: PainFlagInput[];
  onChange: (flags: PainFlagInput[]) => void;
}) {
  const [side, setSide] = useState<"FRONT" | "BACK">("FRONT");
  const regions = side === "FRONT" ? FRONT_BODY_REGIONS : BACK_BODY_REGIONS;

  function flagFor(region: string) {
    return painFlags.find((f) => f.region === region);
  }

  function toggleRegion(region: string) {
    if (flagFor(region)) {
      onChange(painFlags.filter((f) => f.region !== region));
    } else {
      onChange([
        ...painFlags,
        { region: region as PainFlagInput["region"], severity: 5, pastOrCurrent: "CURRENT" },
      ]);
    }
  }

  function updateFlag(region: string, patch: Partial<PainFlagInput>) {
    onChange(
      painFlags.map((f) => (f.region === region ? { ...f, ...patch } : f)),
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">
        Mapa corporal — dores e lesões
      </legend>
      <p className="mt-1 text-sm text-muted-foreground">
        Toque nas regiões onde você sente ou já sentiu dor.
      </p>

      <div className="mt-3 inline-flex rounded-md border border-border">
        <button
          type="button"
          onClick={() => setSide("FRONT")}
          aria-pressed={side === "FRONT"}
          className={`min-h-11 rounded-l-md px-4 text-sm font-medium ${
            side === "FRONT"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground"
          }`}
        >
          Frente
        </button>
        <button
          type="button"
          onClick={() => setSide("BACK")}
          aria-pressed={side === "BACK"}
          className={`min-h-11 rounded-r-md px-4 text-sm font-medium ${
            side === "BACK"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground"
          }`}
        >
          Costas
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {regions.map((region) => {
          const active = Boolean(flagFor(region));
          return (
            <button
              key={region}
              type="button"
              aria-pressed={active}
              onClick={() => toggleRegion(region)}
              className={regionButtonClass(active)}
            >
              {BODY_REGION_LABELS[region] ?? region}
            </button>
          );
        })}
      </div>

      {painFlags.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {painFlags.map((flag) => (
            <li
              key={flag.region}
              className="rounded-md border border-border p-3"
            >
              <p className="text-sm font-medium text-foreground">
                {BODY_REGION_LABELS[flag.region] ?? flag.region}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm text-muted-foreground">
                  Intensidade da dor — {BODY_REGION_LABELS[flag.region] ?? flag.region}
                  <select
                    aria-label={`Intensidade da dor — ${BODY_REGION_LABELS[flag.region] ?? flag.region}`}
                    value={flag.severity}
                    onChange={(e) =>
                      updateFlag(flag.region, { severity: Number(e.target.value) })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="text-sm text-muted-foreground">
                  <legend>
                    Quando — {BODY_REGION_LABELS[flag.region] ?? flag.region}
                  </legend>
                  <div className="mt-1 flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`recency-${flag.region}`}
                        checked={flag.pastOrCurrent === "CURRENT"}
                        onChange={() =>
                          updateFlag(flag.region, { pastOrCurrent: "CURRENT" })
                        }
                      />
                      Atual
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`recency-${flag.region}`}
                        checked={flag.pastOrCurrent === "PAST"}
                        onChange={() =>
                          updateFlag(flag.region, { pastOrCurrent: "PAST" })
                        }
                      />
                      Passado
                    </label>
                  </div>
                </fieldset>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
