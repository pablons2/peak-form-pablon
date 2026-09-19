"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { inputClass, SubmitButton, FormError } from "../../auth/components/fields";
import { createCheckInScheduleAction } from "../actions";
import { CADENCE_LABELS, WEEKDAY_LABELS } from "../labels";

interface FormValues {
  type: "ONE_OFF" | "RECURRING";
  dueDate: string;
  cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  anchor: string;
  note: string;
}

// PRD 02 §5.6 — creating a check-in schedule: ONE_OFF carries a single date,
// RECURRING carries a cadence + anchor (weekday for WEEKLY/BIWEEKLY, day-of-
// month for MONTHLY). Both carry an optional note shown to the Client. This
// stays a plain uncontrolled-ish form (not zodResolver) because the
// discriminated union's active branch depends on a live "type" selection —
// only the fields for the chosen type are sent.
export function CreateCheckInForm({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { type: "RECURRING", cadence: "WEEKLY", anchor: "5" },
  });
  const type = watch("type");
  const cadence = watch("cadence");

  async function onSubmit(values: FormValues) {
    setServerError(undefined);
    const result = await createCheckInScheduleAction(
      linkId,
      values.type === "ONE_OFF"
        ? {
            type: "ONE_OFF",
            dueDate: new Date(values.dueDate),
            note: values.note || undefined,
          }
        : {
            type: "RECURRING",
            cadence: values.cadence,
            anchor: Number(values.anchor),
            note: values.note || undefined,
          },
    );
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    reset({ type: "RECURRING", cadence: "WEEKLY", anchor: "5", note: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <FormError message={serverError} />
      <div>
        <label htmlFor="ci-type" className="block text-sm font-medium text-foreground">
          Tipo de lembrete
        </label>
        <select id="ci-type" className={inputClass} {...register("type")}>
          <option value="RECURRING">Recorrente</option>
          <option value="ONE_OFF">Pontual</option>
        </select>
      </div>

      {type === "ONE_OFF" ? (
        <div>
          <label htmlFor="ci-due" className="block text-sm font-medium text-foreground">
            Data
          </label>
          <input
            id="ci-due"
            type="date"
            className={inputClass}
            {...register("dueDate", { required: true })}
          />
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="ci-cadence" className="block text-sm font-medium text-foreground">
              Frequência
            </label>
            <select id="ci-cadence" className={inputClass} {...register("cadence")}>
              {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ci-anchor" className="block text-sm font-medium text-foreground">
              {cadence === "MONTHLY" ? "Dia do mês" : "Dia da semana"}
            </label>
            {cadence === "MONTHLY" ? (
              <input
                id="ci-anchor"
                type="number"
                min={1}
                max={31}
                className={inputClass}
                {...register("anchor", { required: true })}
              />
            ) : (
              <select id="ci-anchor" className={inputClass} {...register("anchor")}>
                {WEEKDAY_LABELS.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}

      <div>
        <label htmlFor="ci-note" className="block text-sm font-medium text-foreground">
          Observação (opcional)
        </label>
        <textarea
          id="ci-note"
          rows={2}
          placeholder="Ex.: traga a pesagem e fotos de progresso"
          className={inputClass}
          {...register("note")}
        />
      </div>

      <SubmitButton pending={isSubmitting} pendingLabel="Criando…">
        Criar lembrete
      </SubmitButton>
    </form>
  );
}
