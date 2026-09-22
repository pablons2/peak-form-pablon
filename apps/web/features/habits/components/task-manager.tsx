"use client";

// PRD 10 §5.3/§7 — a flat personal task list: text + optional due date,
// done/not-done toggle, delete. No sub-tasks, no priorities, no elaborate
// configuration — a single compact quick-entry.
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "../actions";
import type { PublicTask } from "../api-client";

function TaskRow({ task }: { task: PublicTask }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await toggleTaskAction(task.id, !task.done);
      if (result.ok) router.refresh();
    });
  }
  async function nativeToggleAction(): Promise<void> {
    await toggleTaskAction(task.id, !task.done);
  }

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await deleteTaskAction(task.id);
      if (result.ok) router.refresh();
    });
  }
  async function nativeDeleteAction(): Promise<void> {
    await deleteTaskAction(task.id);
  }

  return (
    <li className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      <form action={nativeToggleAction} onSubmit={handleToggleSubmit}>
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

      <div className="flex-1">
        <p className={`text-sm ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {task.text}
        </p>
        {task.dueDate ? (
          <p className="text-xs text-muted-foreground">Prazo: {task.dueDate}</p>
        ) : null}
      </div>

      <form action={nativeDeleteAction} onSubmit={handleDeleteSubmit}>
        <button
          type="submit"
          disabled={pending}
          aria-label={`Excluir tarefa ${task.text}`}
          className="min-h-11 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-60"
        >
          Excluir
        </button>
      </form>
    </li>
  );
}

function AddTaskForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = String(formData.get("text") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    setError(null);
    startTransition(async () => {
      const result = await createTaskAction({ text, dueDate: dueDate || null });
      if (!result.ok) {
        setError(result.message ?? "Não foi possível criar a tarefa.");
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="task-text" className="text-xs font-medium text-muted-foreground">
          Nova tarefa
        </label>
        <input
          id="task-text"
          name="text"
          type="text"
          required
          maxLength={500}
          placeholder="Ex.: comprar suplemento"
          className="min-h-11 rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="task-due-date" className="text-xs font-medium text-muted-foreground">
          Prazo (opcional)
        </label>
        <input
          id="task-due-date"
          name="dueDate"
          type="date"
          className="min-h-11 rounded-md border border-border bg-background p-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        Adicionar tarefa
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function TaskManager({ tasks }: { tasks: PublicTask[] }) {
  const pending = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {tasks.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada ainda.</li>
        ) : null}
        {pending.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {done.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>

      <AddTaskForm />
    </div>
  );
}

