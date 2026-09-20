"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  adminDeleteExerciseAction,
  deleteCustomExerciseAction,
  promoteExerciseAction,
} from "../actions";
import { FormError } from "../../auth/components/fields";

const buttonClass =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const dangerClass =
  "rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

// Small client buttons used on the library/detail/queue pages — each calls
// its server action and refreshes the server-rendered lists.
export function DeleteExerciseButton({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setPending(true);
    setError(undefined);
    const result = await deleteCustomExerciseAction(exerciseId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push("/exercises");
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className={dangerClass}
      >
        {pending ? "Excluindo…" : "Excluir"}
      </button>
      <FormError message={error} />
    </span>
  );
}

export function PromoteExerciseButton({
  exerciseId,
}: {
  exerciseId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onPromote() {
    setPending(true);
    setError(undefined);
    const result = await promoteExerciseAction(exerciseId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onPromote}
        disabled={pending}
        className={buttonClass}
      >
        {pending ? "Promovendo…" : "Promover à biblioteca global"}
      </button>
      <FormError message={error} />
    </span>
  );
}

export function AdminDeleteExerciseButton({
  exerciseId,
}: {
  exerciseId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setPending(true);
    setError(undefined);
    const result = await adminDeleteExerciseAction(exerciseId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className={dangerClass}
      >
        {pending ? "Removendo…" : "Remover"}
      </button>
      <FormError message={error} />
    </span>
  );
}
