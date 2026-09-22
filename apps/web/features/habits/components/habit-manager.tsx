"use client";

// PRD 10 §5.1/§7 — the Client's habit list plus a compact quick-entry, no
// modal wizard (the PRD explicitly calls for "a single quick-entry, no
// elaborate configuration screens").
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { WeekdayInput } from "@peakform/validation";
import { archiveHabitAction, createHabitAction } from "../actions";
import type { HabitWithStatus } from "../api-client";

const WEEKDAY_ORDER: WeekdayInput[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const WEEKDAY_LABELS: Record<WeekdayInput, string> = {
  MONDAY: "Seg",
  TUESDAY: "Ter",
  WEDNESDAY: "Qua",
  THURSDAY: "Qui",
  FRIDAY: "Sex",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

function cadenceLabel(habit: HabitWithStatus): string {
  if (habit.cadence === "DAILY") return "Todos os dias";
  const ordered = WEEKDAY_ORDER.filter((day) => habit.weekdays.includes(day));
  return ordered.map((day) => WEEKDAY_LABELS[day]).join(", ");
}

function ArchiveButton({ habitId }: { habitId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await archiveHabitAction(habitId);
      if (result.ok) router.refresh();
    });
  }

  async function nativeFallbackAction(): Promise<void> {
    await archiveHabitAction(habitId);
  }

  return (
    <form action={nativeFallbackAction} onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-60"
      >
        Arquivar
      </button>
    </form>
  );
}

function AddHabitForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cadence, setCadence] = useState<"DAILY" | "SPECIFIC_WEEKDAYS">("DAILY");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const reminderTime = String(formData.get("reminderTime") ?? "").trim();
    const weekdays = formData.getAll("weekdays") as WeekdayInput[];
    setError(null);
    startTransition(async () => {
      const result = await createHabitAction({
        name,
        cadence,
        weekdays: cadence === "SPECIFIC_WEEKDAYS" ? weekdays : [],
        reminderTime: reminderTime || null,
      });
      if (!result.ok) {
        setError(result.message ?? "Não foi possível criar o hábito.");
        return;
      }
      form.reset();
      setCadence("DAILY");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="habit-name" className="text-xs font-medium text-muted-foreground">
          Novo hábito
        </label>
        <input
          id="habit-name"
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="Ex.: beber água, alongar 10 min"
          className="min-h-11 rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="habit-cadence" className="text-xs font-medium text-muted-foreground">
          Frequência
        </label>
        <select
          id="habit-cadence"
          name="cadence"
          value={cadence}
          onChange={(event) => setCadence(event.target.value as "DAILY" | "SPECIFIC_WEEKDAYS")}
          className="min-h-11 rounded-md border border-border bg-background p-2 text-sm"
        >
          <option value="DAILY">Todos os dias</option>
          <option value="SPECIFIC_WEEKDAYS">Dias específicos</option>
        </select>
      </div>

      {cadence === "SPECIFIC_WEEKDAYS" ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-medium text-muted-foreground">Dias da semana</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_ORDER.map((day) => (
              <label
                key={day}
                className="flex min-h-11 items-center gap-1 rounded-md border border-border px-2 text-sm"
              >
                <input type="checkbox" name="weekdays" value={day} />
                {WEEKDAY_LABELS[day]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="habit-reminder" className="text-xs font-medium text-muted-foreground">
          Horário do lembrete (opcional)
        </label>
        <input
          id="habit-reminder"
          name="reminderTime"
          type="time"
          className="min-h-11 rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        Adicionar hábito
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function HabitManager({ habits }: { habits: HabitWithStatus[] }) {
  const activeHabits = habits.filter((habit) => !habit.archivedAt);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {activeHabits.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhum hábito cadastrado ainda.</li>
        ) : null}
        {activeHabits.map((habit) => (
          <li
            key={habit.id}
            className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
          >
            <div className="flex-1">
              <p className="text-sm text-foreground">{habit.name}</p>
              <p className="text-xs text-muted-foreground">
                {cadenceLabel(habit)} · Sequência: {habit.streak} dia(s)
              </p>
            </div>
            <ArchiveButton habitId={habit.id} />
          </li>
        ))}
      </ul>

      <AddHabitForm />
    </div>
  );
}

