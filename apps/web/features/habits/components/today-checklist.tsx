"use client";

// PRD 10 §5.4 — the "Today" checklist card: today's due, unchecked habits
// and today's due/overdue, not-done tasks. Self-contained (props are just
// the /productivity/today payload) so PRD 09's dashboard can compose this
// same component without knowing anything about habits/tasks internals.
import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { checkInHabitAction, toggleTaskAction, uncheckHabitAction } from "../actions";
import type { HabitWithStatus, PublicTask } from "../api-client";

// Pinned to America/Sao_Paulo for the same reason as
// features/messaging/components/thread-view.tsx's formatSentAt — this app
// is Brazil-focused, and the value is used to build a same-day check-in
// key, so it must agree with whatever "today" the API resolved server-side.
function todayIsoDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function HabitRow({ habit }: { habit: HabitWithStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = habit.checkedToday
        ? await uncheckHabitAction(habit.id, todayIsoDate())
        : await checkInHabitAction(habit.id);
      if (result.ok) router.refresh();
    });
  }

  // Native fallback keeps this working before hydration finishes — the
  // same real, reproduced bug documented in thread-view.tsx's Composer: a
  // bare onClick handler needs React to have already attached the
  // listener, and a click landing just before that finished was silently
  // dropped.
  async function nativeFallbackAction(): Promise<void> {
    if (habit.checkedToday) {
      await uncheckHabitAction(habit.id, todayIsoDate());
    } else {
      await checkInHabitAction(habit.id);
    }
  }

  return (
    <li className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <form action={nativeFallbackAction} onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={pending}
          aria-pressed={habit.checkedToday}
          aria-label={habit.checkedToday ? `Desmarcar ${habit.name}` : `Marcar ${habit.name} como feito`}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border text-sm font-semibold disabled:opacity-60 ${
            habit.checkedToday
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground"
          }`}
        >
          {habit.checkedToday ? "✓" : ""}
        </button>
      </form>
      <div className="flex-1">
        <p className="text-sm text-foreground">{habit.name}</p>
        <p className="text-xs text-muted-foreground">
          {habit.streak > 0 ? `Sequência: ${habit.streak} dia(s)` : "Sem sequência ainda"}
        </p>
      </div>
    </li>
  );
}

function TaskRow({ task }: { task: PublicTask }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await toggleTaskAction(task.id, !task.done);
      if (result.ok) router.refresh();
    });
  }

  async function nativeFallbackAction(): Promise<void> {
    await toggleTaskAction(task.id, !task.done);
  }

  return (
    <li className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <form action={nativeFallbackAction} onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={pending}
          aria-pressed={task.done}
          aria-label={task.done ? `Reabrir tarefa ${task.text}` : `Concluir tarefa ${task.text}`}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border text-sm font-semibold disabled:opacity-60 ${
            task.done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground"
          }`}
        >
          {task.done ? "✓" : ""}
        </button>
      </form>
      <p className={`flex-1 text-sm ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {task.text}
      </p>
    </li>
  );
}

export function TodayChecklist({
  habits,
  tasks,
}: {
  habits: HabitWithStatus[];
  tasks: PublicTask[];
}) {
  if (habits.length === 0 && tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nada pendente por hoje — bom trabalho!
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {habits.map((habit) => (
        <HabitRow key={habit.id} habit={habit} />
      ))}
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}

