"use client";

// PRD 07 §5.2/§7 — the rest timer that auto-starts after a set is logged,
// defaulting to the prescription's restSeconds, user-adjustable. This is the
// component apps/web/app/layout.tsx's comment earmarked as "the
// set-logging/rest-timer UI" for wiring IBM Plex Mono (--font-mono, the
// design system's numeric/timer-context font) — scoped here rather than at
// the root layout, the same way Plus_Jakarta_Sans is scoped there.
import { useEffect, useRef, useState } from "react";
import { IBM_Plex_Mono } from "next/font/google";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], display: "swap" });

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RestTimer({
  defaultSeconds,
  startSignal,
}: {
  defaultSeconds: number;
  // Bumping this value (e.g. to Date.now()) restarts the countdown — the
  // parent passes a fresh value each time a new set is logged.
  startSignal: number;
}) {
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startSignal === 0) return;
    setRemaining(defaultSeconds);
    setRunning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  if (startSignal === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2">
      <span className={`${mono.className} text-lg font-semibold tabular-nums text-foreground`}>
        {formatTime(Math.max(0, remaining))}
      </span>
      <span className="text-xs text-muted-foreground">
        {running ? "Descanso" : remaining === 0 ? "Descanso concluído" : "Pausado"}
      </span>
      <div className="ml-auto flex gap-2">
        <button
          type="button"
          onClick={() => setRemaining((r) => r + 15)}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-card"
        >
          +15s
        </button>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-card"
        >
          {running ? "Pausar" : "Retomar"}
        </button>
      </div>
    </div>
  );
}
