import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  difficultySchema,
  equipmentSchema,
  muscleGroupSchema,
} from "@peakform/validation";
import { authOptions } from "@/features/auth/nextauth-options";
import {
  listMyExercises,
  searchExercises,
  type PublicExercise,
} from "@/features/exercises/api-client";
import { ExerciseCard } from "@/features/exercises/components/exercise-card";
import {
  DIFFICULTY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
} from "@/features/exercises/labels";

export const metadata = { title: "Biblioteca de Exercícios — PeakForm" };

const filterInputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

// PRD 05 §5.4/§7 — the exercise library, readable by every role (Clients
// read-only). Filters submit as GET params so results are server-rendered,
// linkable, and work without client JS.
export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accessToken = session.accessToken!;
  const role = session.user.role;
  const canAuthor = role === "PROFESSIONAL" || role === "ADMIN";

  const pick = (key: string) =>
    typeof searchParams[key] === "string" ? (searchParams[key] as string) : undefined;
  const filters = {
    q: pick("q"),
    muscleGroup: pick("muscleGroup"),
    equipment: pick("equipment"),
    difficulty: pick("difficulty"),
  };

  const [result, mine] = await Promise.all([
    searchExercises(accessToken, filters),
    canAuthor ? listMyExercises(accessToken) : Promise.resolve(null),
  ]);
  const exercises: PublicExercise[] = result.ok ? result.data : [];
  const myExercises: PublicExercise[] =
    mine && mine.ok ? mine.data : [];
  const hasFilters = Boolean(
    filters.q || filters.muscleGroup || filters.equipment || filters.difficulty,
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Biblioteca de exercícios
        </h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      {role === "ADMIN" ? (
        <p className="text-sm">
          <Link href="/admin/exercises" className="text-accent hover:underline">
            Revisão de exercícios personalizados →
          </Link>
        </p>
      ) : null}

      {canAuthor ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Meus exercícios personalizados
            </h2>
            <Link
              href="/exercises/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Novo exercício
            </Link>
          </div>
          {myExercises.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Você ainda não criou exercícios personalizados.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myExercises.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <form method="get" action="/exercises" className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Buscar e filtrar</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="block text-sm text-muted-foreground">
              Nome
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Ex.: agachamento"
              className={filterInputClass}
            />
          </div>
          <div>
            <label
              htmlFor="muscleGroup"
              className="block text-sm text-muted-foreground"
            >
              Grupo muscular
            </label>
            <select
              id="muscleGroup"
              name="muscleGroup"
              defaultValue={filters.muscleGroup ?? ""}
              className={filterInputClass}
            >
              <option value="">Todos</option>
              {muscleGroupSchema.options.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_GROUP_LABELS[m] ?? m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="equipment"
              className="block text-sm text-muted-foreground"
            >
              Equipamento
            </label>
            <select
              id="equipment"
              name="equipment"
              defaultValue={filters.equipment ?? ""}
              className={filterInputClass}
            >
              <option value="">Todos</option>
              {equipmentSchema.options.map((e) => (
                <option key={e} value={e}>
                  {EQUIPMENT_LABELS[e] ?? e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="difficulty"
              className="block text-sm text-muted-foreground"
            >
              Dificuldade
            </label>
            <select
              id="difficulty"
              name="difficulty"
              defaultValue={filters.difficulty ?? ""}
              className={filterInputClass}
            >
              <option value="">Todas</option>
              {difficultySchema.options.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d] ?? d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Buscar
          </button>
          {hasFilters ? (
            <Link href="/exercises" className="text-sm text-accent hover:underline">
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <section aria-label="Resultados">
        {exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "Nenhum exercício encontrado para esses filtros."
              : "A biblioteca está vazia — o catálogo ainda não foi importado."}
          </p>
        ) : (
          <ul className="space-y-2">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
