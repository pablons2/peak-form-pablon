"use client";

// PRD 04 §5.2/§7 — the Professional's (or Admin's) formal assessment.
// Sections are ordered exactly per the physical-exam flow (§7): basic
// measurements → circumferences → skinfolds → posture → goals, to match
// muscle memory for evaluators trained on this protocol. Computed
// BMI/WHR/%BF are server-side (the use-case), never guessed client-side —
// this form only collects raw measurements and shows what the API returns
// after submit.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  BodyAssessmentGoalTypeInput,
  CircumferencesInput,
  PostureScreeningInput,
  SkinfoldsInput,
} from "@peakform/validation";
import { inputClass } from "../../auth/components/fields";
import { createFormalAssessmentAction } from "../actions";
import type { PublicBodyAssessment } from "../api-client";
import {
  GOAL_TYPE_LABELS,
  POSTURE_FOOT_POSTURE_LABELS,
  POSTURE_HEAD_POSITION_LABELS,
  POSTURE_KNEE_ALIGNMENT_LABELS,
  POSTURE_PELVIC_TILT_LABELS,
  POSTURE_SCAPULAR_LABELS,
  POSTURE_SHOULDER_LEVEL_LABELS,
  POSTURE_SPINAL_CURVATURE_LABELS,
  CIRCUMFERENCE_LABELS,
  SKINFOLD_SITE_LABELS,
} from "../labels";

const CIRCUMFERENCE_FIELDS: (keyof CircumferencesInput)[] = [
  "neck",
  "chest",
  "waist",
  "hip",
  "armRelaxed",
  "armFlexed",
  "thigh",
  "calf",
];
const SKINFOLD_FIELDS: (keyof SkinfoldsInput)[] = [
  "chest",
  "midaxillary",
  "triceps",
  "subscapular",
  "abdominal",
  "suprailiac",
  "thigh",
];

function selectField<T extends string>(
  labels: Record<string, string>,
): { value: T; text: string }[] {
  return Object.entries(labels).map(([value, text]) => ({ value: value as T, text }));
}

export function FormalAssessmentForm({
  clientId,
  onCreated,
}: {
  clientId: string;
  onCreated?: (entry: PublicBodyAssessment) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<PublicBodyAssessment>();

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [circumferences, setCircumferences] = useState<
    Partial<Record<keyof CircumferencesInput, string>>
  >({});

  const [includeSkinfolds, setIncludeSkinfolds] = useState(false);
  const [skinfolds, setSkinfolds] = useState<Partial<Record<keyof SkinfoldsInput, string>>>({});

  const [useOverride, setUseOverride] = useState(false);
  const [overridePercent, setOverridePercent] = useState("");
  const [overrideNote, setOverrideNote] = useState("");

  const [includePosture, setIncludePosture] = useState(false);
  const [posture, setPosture] = useState<Partial<PostureScreeningInput>>({});

  const [includeGoal, setIncludeGoal] = useState(false);
  const [goalType, setGoalType] = useState<BodyAssessmentGoalTypeInput>("WEIGHT_LOSS");
  const [goalTargetValue, setGoalTargetValue] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalNote, setGoalNote] = useState("");

  const progressPhotoRef = useRef<HTMLInputElement>(null);
  const postureAnteriorRef = useRef<HTMLInputElement>(null);
  const posturePosteriorRef = useRef<HTMLInputElement>(null);
  const postureLateralLeftRef = useRef<HTMLInputElement>(null);
  const postureLateralRightRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    const weightNum = Number(weight);
    const heightNum = Number(height);
    if (!weightNum || !heightNum) {
      setError("Peso e altura são obrigatórios.");
      return;
    }

    const circumferencesOut: Record<string, number> = {};
    for (const f of CIRCUMFERENCE_FIELDS) {
      const v = circumferences[f];
      if (v) circumferencesOut[f] = Number(v);
    }

    let skinfoldsOut: SkinfoldsInput | undefined;
    if (includeSkinfolds) {
      const missing = SKINFOLD_FIELDS.some((f) => !skinfolds[f]);
      if (missing) {
        setError("Preencha as 7 dobras cutâneas ou desmarque a seção.");
        return;
      }
      skinfoldsOut = SKINFOLD_FIELDS.reduce((acc, f) => {
        acc[f] = Number(skinfolds[f]);
        return acc;
      }, {} as Record<string, number>) as unknown as SkinfoldsInput;
    }

    if (useOverride && !overrideNote.trim()) {
      setError("Informe o método usado ao sobrescrever o % de gordura.");
      return;
    }

    const photos: { tag: "PROGRESS" | "POSTURE"; file: File }[] = [];
    if (progressPhotoRef.current?.files?.[0]) {
      photos.push({ tag: "PROGRESS", file: progressPhotoRef.current.files[0] });
    }
    for (const ref of [
      postureAnteriorRef,
      posturePosteriorRef,
      postureLateralLeftRef,
      postureLateralRightRef,
    ]) {
      if (ref.current?.files?.[0]) {
        photos.push({ tag: "POSTURE", file: ref.current.files[0] });
      }
    }

    setSaving(true);
    const res = await createFormalAssessmentAction(clientId, {
      weight: weightNum,
      height: heightNum,
      circumferences:
        Object.keys(circumferencesOut).length > 0
          ? (circumferencesOut as CircumferencesInput)
          : undefined,
      skinfolds: skinfoldsOut,
      bodyFatOverride: useOverride
        ? { percent: Number(overridePercent), note: overrideNote.trim() }
        : undefined,
      postureScreening: includePosture
        ? (posture as PostureScreeningInput)
        : undefined,
      goal: includeGoal
        ? {
            goalType,
            goalTargetValue: goalTargetValue ? Number(goalTargetValue) : null,
            goalTargetDate: goalTargetDate ? new Date(goalTargetDate) : null,
            goalNote: goalNote || null,
          }
        : undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
    setSaving(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    setResult(res.entry);
    onCreated?.(res.entry!);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <p role="status" className="rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
          Avaliação registrada — IMC {result.bmi}
          {result.waistHipRatio != null ? `, RCQ ${result.waistHipRatio}` : ""}
          {result.bodyFatPercent != null ? `, ${result.bodyFatPercent}% gordura` : ""}.
        </p>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">
          1. Medidas básicas
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-foreground">
            Peso (kg)
            <input
              type="number"
              step="0.1"
              required
              className={inputClass}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label className="text-sm text-foreground">
            Altura (cm)
            <input
              type="number"
              step="0.1"
              required
              className={inputClass}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm text-foreground">
          Foto de progresso (opcional)
          <input
            ref={progressPhotoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm text-foreground"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">
          2. Circunferências (cm, lado direito)
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CIRCUMFERENCE_FIELDS.map((f) => (
            <label key={f} className="text-xs text-foreground">
              {CIRCUMFERENCE_LABELS[f]}
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={circumferences[f] ?? ""}
                onChange={(e) =>
                  setCircumferences((c) => ({ ...c, [f]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">
          3. Dobras cutâneas — protocolo Pollock 7 dobras (mm)
        </legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includeSkinfolds}
            onChange={(e) => setIncludeSkinfolds(e.target.checked)}
          />
          Registrar dobras cutâneas nesta avaliação
        </label>
        {includeSkinfolds ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SKINFOLD_FIELDS.map((f) => (
              <label key={f} className="text-xs text-foreground">
                {SKINFOLD_SITE_LABELS[f]}
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={skinfolds[f] ?? ""}
                  onChange={(e) =>
                    setSkinfolds((s) => ({ ...s, [f]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
          />
          Sobrescrever % de gordura manualmente (ex.: bioimpedância, DEXA)
        </label>
        {useOverride ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-foreground">
              % gordura manual
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className={inputClass}
                value={overridePercent}
                onChange={(e) => setOverridePercent(e.target.value)}
              />
            </label>
            <label className="text-xs text-foreground">
              Método usado (obrigatório)
              <input
                type="text"
                className={inputClass}
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">
          4. Avaliação postural
        </legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includePosture}
            onChange={(e) => setIncludePosture(e.target.checked)}
          />
          Registrar checklist postural nesta avaliação
        </label>
        {includePosture ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-foreground">
                Posição da cabeça
                <select
                  className={inputClass}
                  value={posture.headPosition ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      headPosition: e.target.value as PostureScreeningInput["headPosition"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_HEAD_POSITION_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground">
                Nível dos ombros
                <select
                  className={inputClass}
                  value={posture.shoulderLevel ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      shoulderLevel: e.target.value as PostureScreeningInput["shoulderLevel"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_SHOULDER_LEVEL_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground">
                Posição escapular
                <select
                  className={inputClass}
                  value={posture.scapularPosition ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      scapularPosition: e.target.value as PostureScreeningInput["scapularPosition"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_SCAPULAR_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground">
                Curvatura espinhal (rastreio, não diagnóstico)
                <select
                  className={inputClass}
                  value={posture.spinalCurvatureFlag ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      spinalCurvatureFlag:
                        e.target.value as PostureScreeningInput["spinalCurvatureFlag"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_SPINAL_CURVATURE_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground">
                Inclinação pélvica
                <select
                  className={inputClass}
                  value={posture.pelvicTilt ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      pelvicTilt: e.target.value as PostureScreeningInput["pelvicTilt"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_PELVIC_TILT_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground">
                Alinhamento dos joelhos
                <select
                  className={inputClass}
                  value={posture.kneeAlignment ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      kneeAlignment: e.target.value as PostureScreeningInput["kneeAlignment"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_KNEE_ALIGNMENT_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-foreground">
                Postura do pé
                <select
                  className={inputClass}
                  value={posture.footPosture ?? ""}
                  onChange={(e) =>
                    setPosture((p) => ({
                      ...p,
                      footPosture: e.target.value as PostureScreeningInput["footPosture"],
                    }))
                  }
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {selectField(POSTURE_FOOT_POSTURE_LABELS).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.text}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs text-foreground">
              Notas
              <input
                type="text"
                className={inputClass}
                value={posture.notes ?? ""}
                onChange={(e) => setPosture((p) => ({ ...p, notes: e.target.value }))}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Fotos: anterior, posterior e ambas as laterais, postura neutra, mesma
              distância, fundo neutro.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-foreground">
                Anterior
                <input ref={postureAnteriorRef} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" />
              </label>
              <label className="text-xs text-foreground">
                Posterior
                <input ref={posturePosteriorRef} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" />
              </label>
              <label className="text-xs text-foreground">
                Lateral esquerda
                <input ref={postureLateralLeftRef} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" />
              </label>
              <label className="text-xs text-foreground">
                Lateral direita
                <input ref={postureLateralRightRef} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-xs" />
              </label>
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">5. Meta</legend>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={includeGoal}
            onChange={(e) => setIncludeGoal(e.target.checked)}
          />
          Definir meta nesta avaliação
        </label>
        {includeGoal ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-foreground">
              Tipo de meta
              <select
                className={inputClass}
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as BodyAssessmentGoalTypeInput)}
              >
                {selectField(GOAL_TYPE_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.text}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-foreground">
              Valor alvo (opcional)
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={goalTargetValue}
                onChange={(e) => setGoalTargetValue(e.target.value)}
              />
            </label>
            <label className="text-xs text-foreground">
              Data alvo (opcional)
              <input
                type="date"
                className={inputClass}
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
              />
            </label>
            <label className="text-xs text-foreground">
              Nota (opcional)
              <input
                type="text"
                className={inputClass}
                value={goalNote}
                onChange={(e) => setGoalNote(e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </fieldset>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : "Registrar avaliação"}
      </button>
    </form>
  );
}
