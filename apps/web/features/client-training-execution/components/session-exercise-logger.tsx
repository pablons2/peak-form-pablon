"use client";

// PRD 07 §5.2/§7 — one prescribed exercise's logging card: target line,
// "last time" reference, already-logged sets, a quick log-set form, the
// auto-starting rest timer, and the disabled form-check-video placeholder
// (§5.5). Large touch targets, one-handed use — this is the gym-use screen
// the PRD calls out explicitly (§7), so the log form stays a single row of
// big inputs rather than a multi-field modal.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getExercise } from "../../exercises/api-client";
import { inputClass } from "../../auth/components/fields";
import type { PublicSessionExerciseExecution } from "../api-client";
import { logSetAction } from "../actions";
import { FormCheckVideoButton } from "./form-check-video-button";
import { RestTimer } from "./rest-timer";
import { SessionExerciseDetail } from "./session-exercise-detail";

function targetLine(e: PublicSessionExerciseExecution): string {
  const reps =
    e.targetRepsMax && e.targetRepsMax !== e.targetRepsMin
      ? `${e.targetRepsMin}–${e.targetRepsMax}`
      : `${e.targetRepsMin}`;
  const load = e.targetLoad ? ` @ ${e.targetLoad}kg` : "";
  const intensity = e.targetRpe ? ` · RPE ${e.targetRpe}` : e.targetRir ? ` · RIR ${e.targetRir}` : "";
  return `${e.targetSets} séries × ${reps} reps${load}${intensity}`;
}

function lastTimeLine(e: PublicSessionExerciseExecution): string | null {
  if (!e.lastTime) return null;
  const load = e.lastTime.actualLoad ? `${e.lastTime.actualLoad}kg x ${e.lastTime.actualReps}` : `${e.lastTime.actualReps} reps`;
  const intensity = e.lastTime.actualRpeOrRir ? ` @ RPE${e.lastTime.actualRpeOrRir}` : "";
  return `Last time: ${load}${intensity}`;
}

export function SessionExerciseLogger({
  sessionId,
  exercise,
  mediaUrl,
  disabled,
  accessToken,
}: {
  sessionId: string;
  exercise: PublicSessionExerciseExecution;
  mediaUrl?: string | null;
  disabled: boolean;
  accessToken?: string;
}) {
  const router = useRouter();
  const [reps, setReps] = useState("");
  const [load, setLoad] = useState("");
  const [rpeOrRir, setRpeOrRir] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [timerSignal, setTimerSignal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loggedCount = exercise.logs.length;
  const remaining = Math.max(0, exercise.targetSets - loggedCount);
  const last = lastTimeLine(exercise);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    const repsNum = Number(reps);
    if (!repsNum || repsNum <= 0) {
      setError("Informe as repetições feitas.");
      return;
    }
    setSaving(true);
    setError(undefined);
    const result = await logSetAction(sessionId, exercise.id, {
      actualReps: repsNum,
      actualLoad: load ? Number(load) : null,
      actualRpeOrRir: rpeOrRir ? Number(rpeOrRir) : null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReps("");
    setLoad("");
    setRpeOrRir("");
    setTimerSignal(Date.now());
    router.refresh();
  }

  async function handleOpenDetail() {
    if (!accessToken) return;
    setLoadingDetail(true);
    const result = await getExercise(accessToken, exercise.exerciseId);
    setLoadingDetail(false);
    if (result.ok) {
      setDetailExercise(result.data);
      setDetailOpen(true);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Media Preview */}
        <div className="space-y-3 p-3">
          {mediaUrl ? (
            <div className="flex justify-center rounded-md border border-border bg-muted overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt=""
                loading="lazy"
                className="h-32 w-full max-w-sm object-contain"
              />
            </div>
          ) : null}

          <div>
            <h3 className="text-base font-semibold text-foreground">{exercise.exerciseName}</h3>
            <p className="text-xs text-muted-foreground">{targetLine(exercise)}</p>
            {last ? <p className="mt-1 text-xs font-medium text-accent">{last}</p> : null}
          </div>

          {accessToken && (
            <button
              type="button"
              onClick={handleOpenDetail}
              disabled={loadingDetail}
              className="w-full rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              {loadingDetail ? "Carregando…" : "Ver técnica"}
            </button>
          )}

          {exercise.logs.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {exercise.logs.map((log) => (
                <li key={log.id}>
                  Série {log.setNumber}: {log.actualReps} reps
                  {log.actualLoad ? ` × ${log.actualLoad}kg` : ""}
                  {log.actualRpeOrRir ? ` @ ${log.actualRpeOrRir}` : ""}
                </li>
              ))}
            </ul>
          ) : null}

          {!disabled ? (
            <form onSubmit={handleLog} className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-medium text-foreground">
                Série {loggedCount + 1}{remaining > 0 ? ` de ${exercise.targetSets}` : ""}
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Reps"
                  min="0"
                  max="200"
                  required
                  className={`${inputClass} min-h-11 w-20`}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Carga (kg)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="—"
                  className={`${inputClass} min-h-11 w-20`}
                  value={load}
                  onChange={(e) => setLoad(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                RPE/RIR
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="—"
                  className={`${inputClass} min-h-11 w-16`}
                  value={rpeOrRir}
                  onChange={(e) => setRpeOrRir(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Registrar série"}
              </button>
              <FormCheckVideoButton />
            </form>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <div>
            <RestTimer defaultSeconds={exercise.restSeconds ?? 90} startSignal={timerSignal} />
          </div>
        </div>
      </div>

      <SessionExerciseDetail
        exercise={detailExercise}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}
