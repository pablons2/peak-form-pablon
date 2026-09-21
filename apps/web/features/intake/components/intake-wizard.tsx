"use client";

// PRD 03 §5.1/§7 — the multi-step intake questionnaire: readiness (PAR-Q),
// body-map pain flags, medical conditions, availability + equipment access,
// then a review/submit step. Each step autosaves via a PATCH server action
// before advancing (so a Client who abandons the flow mid-way keeps their
// progress — the IN_PROGRESS draft on reload resumes exactly here); nothing
// is written by "Concluir triagem" that the Client hasn't already seen saved.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AvailabilityInput,
  EquipmentAccessInput,
  MedicalConditionInput,
  PainFlagInput,
} from "@peakform/validation";
import { FormError, inputClass } from "../../auth/components/fields";
import { completeIntakeAction, updateIntakeAction } from "../actions";
import type { PublicIntake } from "../api-client";
import { MEDICAL_CONDITION_LABELS, PARQ_QUESTIONS } from "../labels";
import { BodyMapPicker } from "./body-map-picker";
import { SkipIntakeDialog } from "./skip-intake-dialog";

const STEP_TITLES = [
  "Prontidão (PAR-Q)",
  "Mapa corporal",
  "Condições de saúde",
  "Disponibilidade e equipamentos",
  "Revisão",
];

export function IntakeWizard({ intake }: { intake: PublicIntake }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const [parqAnswers, setParqAnswers] = useState<Record<string, boolean>>(
    intake.parqAnswers ?? {},
  );
  const [painFlags, setPainFlags] = useState<PainFlagInput[]>(
    intake.painFlags.map((f) => ({
      region: f.region,
      severity: f.severity,
      pastOrCurrent: f.pastOrCurrent,
    })),
  );
  const [medicalConditions, setMedicalConditions] = useState<
    MedicalConditionInput[]
  >(intake.medicalConditions);
  const [otherNote, setOtherNote] = useState(
    intake.medicalConditionsOtherNote ?? "",
  );
  const [medications, setMedications] = useState(intake.medications ?? "");
  const [availability, setAvailability] = useState<AvailabilityInput>(
    intake.availability ?? { daysPerWeek: 3, sessionDurationMinutes: 60 },
  );
  const [equipmentAccess, setEquipmentAccess] = useState<EquipmentAccessInput>(
    intake.equipmentAccess ?? { location: "GYM", homeEquipment: [] },
  );
  const [homeEquipmentText, setHomeEquipmentText] = useState(
    (intake.equipmentAccess?.homeEquipment ?? []).join(", "),
  );

  const hasAdvisory = Object.values(parqAnswers).some(Boolean);
  const allParqAnswered = PARQ_QUESTIONS.every((q) => q.code in parqAnswers);

  async function saveAndAdvance(payload: Record<string, unknown>) {
    setSaving(true);
    setError(undefined);
    const result = await updateIntakeAction(intake.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  }

  async function handleComplete() {
    setSaving(true);
    setError(undefined);
    const result = await completeIntakeAction(intake.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">
          Etapa {step + 1} de {STEP_TITLES.length}: {STEP_TITLES[step]}
        </h2>
        <SkipIntakeDialog intakeId={intake.id} />
      </div>

      <FormError message={error} />

      {step === 0 ? (
        <fieldset className="space-y-4">
          <legend className="sr-only">Prontidão (PAR-Q)</legend>
          {hasAdvisory ? (
            <p
              role="status"
              className="rounded-md bg-accent/10 px-3 py-2 text-sm text-foreground"
            >
              Suas respostas sugerem que você deve consultar um médico antes de
              iniciar um novo programa de exercícios. Isso não é um
              diagnóstico — seu profissional decidirá como prosseguir.
            </p>
          ) : null}
          {PARQ_QUESTIONS.map((q) => (
            <fieldset key={q.code}>
              <legend className="text-sm text-foreground">{q.question}</legend>
              <div className="mt-1 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    name={q.code}
                    checked={parqAnswers[q.code] === true}
                    onChange={() =>
                      setParqAnswers((a) => ({ ...a, [q.code]: true }))
                    }
                  />
                  Sim
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="radio"
                    name={q.code}
                    checked={parqAnswers[q.code] === false}
                    onChange={() =>
                      setParqAnswers((a) => ({ ...a, [q.code]: false }))
                    }
                  />
                  Não
                </label>
              </div>
            </fieldset>
          ))}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAndAdvance({ parqAnswers })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Próximo"}
            </button>
          </div>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <BodyMapPicker painFlags={painFlags} onChange={setPainFlags} />
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAndAdvance({ painFlags })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Próximo"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-foreground">
              Condições médicas
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(MEDICAL_CONDITION_LABELS).map(([code, label]) => (
                <label
                  key={code}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={medicalConditions.includes(
                      code as MedicalConditionInput,
                    )}
                    onChange={(e) =>
                      setMedicalConditions((prev) =>
                        e.target.checked
                          ? [...prev, code as MedicalConditionInput]
                          : prev.filter((c) => c !== code),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {medicalConditions.includes("OTHER") ? (
            <div>
              <label
                htmlFor="otherNote"
                className="block text-sm font-medium text-foreground"
              >
                Descreva a condição &quot;Outra&quot;
              </label>
              <input
                id="otherNote"
                className={inputClass}
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
              />
            </div>
          ) : null}
          <div>
            <label
              htmlFor="medications"
              className="block text-sm font-medium text-foreground"
            >
              Medicamentos em uso (opcional)
            </label>
            <input
              id="medications"
              className={inputClass}
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                saveAndAdvance({
                  medicalConditions,
                  medicalConditionsOtherNote: otherNote || null,
                  medications: medications || null,
                })
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Próximo"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              Dias por semana disponíveis
              <select
                className={inputClass}
                value={availability.daysPerWeek}
                onChange={(e) =>
                  setAvailability((a) => ({
                    ...a,
                    daysPerWeek: Number(e.target.value),
                  }))
                }
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              Duração preferida da sessão (min)
              <input
                type="number"
                min={10}
                max={240}
                className={inputClass}
                value={availability.sessionDurationMinutes}
                onChange={(e) =>
                  setAvailability((a) => ({
                    ...a,
                    sessionDurationMinutes: Number(e.target.value),
                  }))
                }
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">
              Onde você treina
            </legend>
            <div className="mt-1 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="equipmentLocation"
                  checked={equipmentAccess.location === "GYM"}
                  onChange={() =>
                    setEquipmentAccess((a) => ({ ...a, location: "GYM" }))
                  }
                />
                Academia
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="equipmentLocation"
                  checked={equipmentAccess.location === "HOME"}
                  onChange={() =>
                    setEquipmentAccess((a) => ({ ...a, location: "HOME" }))
                  }
                />
                Casa
              </label>
            </div>
          </fieldset>

          {equipmentAccess.location === "HOME" ? (
            <div>
              <label
                htmlFor="homeEquipment"
                className="block text-sm font-medium text-foreground"
              >
                Equipamentos disponíveis em casa (separados por vírgula)
              </label>
              <input
                id="homeEquipment"
                className={inputClass}
                placeholder="Ex.: halteres, faixa elástica"
                value={homeEquipmentText}
                onChange={(e) => setHomeEquipmentText(e.target.value)}
              />
            </div>
          ) : null}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const homeEquipment = homeEquipmentText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                setEquipmentAccess((a) => ({ ...a, homeEquipment }));
                void saveAndAdvance({
                  availability,
                  equipmentAccess: { ...equipmentAccess, homeEquipment },
                });
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Próximo"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Revise suas respostas e conclua a triagem. Você pode voltar para
            ajustar qualquer etapa.
          </p>
          {!allParqAnswered ? (
            <p role="alert" className="text-sm text-destructive">
              Responda todas as perguntas de prontidão antes de concluir.
            </p>
          ) : null}
          <ul className="space-y-1 text-sm text-foreground">
            <li>
              Regiões com dor sinalizadas: {painFlags.length === 0 ? "nenhuma" : painFlags.length}
            </li>
            <li>
              Condições médicas: {medicalConditions.length === 0 ? "nenhuma" : medicalConditions.length}
            </li>
          </ul>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={saving || !allParqAnswered}
              onClick={handleComplete}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Enviando…" : "Concluir triagem"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
