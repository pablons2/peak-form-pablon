"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { inputClass } from "../../auth/components/fields";
import { cancelCheckInScheduleAction, updateCheckInScheduleAction } from "../actions";
import type { CheckInSchedule } from "../api-client";
import {
  CADENCE_LABELS,
  SCHEDULE_STATUS_LABELS,
  WEEKDAY_LABELS,
  anchorLabel,
  formatDate,
} from "../labels";

interface EditValues {
  dueDate: string;
  cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  anchor: string;
  note: string;
}

// PRD 02 §5.6/§7 — one check-in schedule row on the Professional's "Check-ins"
// panel: cadence/anchor (or one-off date) and note, with quick edit/cancel —
// "this should feel like setting a reminder, not filling out a form" (§7).
// Only the Professional who created it may edit/cancel (canManage=false on
// the Client's read-only view of the same list).
export function CheckInItem({
  linkId,
  schedule,
  canManage,
}: {
  linkId: string;
  schedule: CheckInSchedule;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const { register, handleSubmit, watch } = useForm<EditValues>({
    defaultValues: {
      dueDate: schedule.dueDate?.slice(0, 10) ?? "",
      cadence: schedule.cadence ?? "WEEKLY",
      anchor: String(schedule.anchor ?? 0),
      note: schedule.note ?? "",
    },
  });
  const cadence = watch("cadence");

  async function onSubmit(values: EditValues) {
    setError(undefined);
    const result = await updateCheckInScheduleAction(linkId, schedule.id, {
      ...(schedule.type === "ONE_OFF"
        ? { dueDate: new Date(values.dueDate) }
        : { cadence: values.cadence, anchor: Number(values.anchor) }),
      note: values.note || undefined,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function onCancel() {
    setError(undefined);
    const result = await cancelCheckInScheduleAction(linkId, schedule.id);
    if (!result.ok) setError(result.message);
    else router.refresh();
  }

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {schedule.type === "ONE_OFF"
              ? `Pontual — ${formatDate(schedule.dueDate)}`
              : `${CADENCE_LABELS[schedule.cadence ?? ""] ?? ""} — ${anchorLabel(schedule.cadence, schedule.anchor)}`}
            {" · "}
            {SCHEDULE_STATUS_LABELS[schedule.status] ?? schedule.status}
          </p>
          {schedule.note ? (
            <p className="text-sm text-muted-foreground">{schedule.note}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Próximo: {formatDate(schedule.nextDueAt)}
          </p>
        </div>
        {canManage && schedule.status === "ACTIVE" ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-sm text-accent hover:underline"
            >
              {editing ? "Fechar" : "Editar"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-destructive hover:underline"
            >
              Cancelar
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      {editing ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-3 space-y-2 border-t border-border pt-3"
          noValidate
        >
          {schedule.type === "ONE_OFF" ? (
            <input type="date" className={inputClass} {...register("dueDate")} />
          ) : (
            <div className="flex gap-2">
              <select className={inputClass} {...register("cadence")}>
                {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {cadence === "MONTHLY" ? (
                <input
                  type="number"
                  min={1}
                  max={31}
                  className={inputClass}
                  {...register("anchor")}
                />
              ) : (
                <select className={inputClass} {...register("anchor")}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <textarea rows={2} className={inputClass} {...register("note")} />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Salvar
          </button>
        </form>
      ) : null}
    </li>
  );
}
