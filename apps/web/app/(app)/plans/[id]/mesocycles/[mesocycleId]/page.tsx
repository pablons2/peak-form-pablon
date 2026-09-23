import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { searchExercises } from "@/features/exercises/api-client";
import { getTrainingPlan, listSessions } from "@/features/training-plans/api-client";
import { WeeklyTemplateEditor } from "@/features/training-plans/components/weekly-template-editor";
import { SessionActions } from "@/features/training-plans/components/session-actions";
import { SESSION_STATUS_LABELS, WEEKDAY_LABELS } from "@/features/training-plans/labels";

export const metadata = { title: "Mesociclo — PeakForm" };

// PRD 06 §5.3/§5.4/§7 — the weekly-template builder (Professional/Admin
// only) and the mesocycle's generated sessions (every viewer, read-only for
// the Client per §4).
export default async function MesocycleDetailPage({
  params,
}: {
  params: { id: string; mesocycleId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accessToken = session.accessToken!;
  const [planResult, exercisesResult, sessionsResult] = await Promise.all([
    getTrainingPlan(accessToken, params.id),
    searchExercises(accessToken, {}),
    listSessions(accessToken, params.mesocycleId),
  ]);
  if (!planResult.ok) notFound();
  const plan = planResult.data;
  const mesocycle = plan.mesocycles.find((m) => m.id === params.mesocycleId);
  if (!mesocycle) notFound();

  const canEdit =
    session.user.role === "ADMIN" ||
    (session.user.role === "PROFESSIONAL" &&
      (plan.professionalId === session.user.id || plan.authoredById === session.user.id));

  const availableExercises = exercisesResult.ok
    ? exercisesResult.data.map((e) => ({ id: e.id, name: e.name }))
    : [];
  const sessions = sessionsResult.ok ? sessionsResult.data : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          {plan.name} — Bloco {mesocycle.order}
        </h1>
        <Link href={`/plans/${plan.id}`} className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      {canEdit ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Template semanal</h2>
          <div className="mt-3">
            <WeeklyTemplateEditor
              mesocycleId={mesocycle.id}
              existing={mesocycle.weeklyTemplates}
              availableExercises={availableExercises}
            />
          </div>
        </section>
      ) : (
        <section aria-label="Template semanal">
          {mesocycle.weeklyTemplates.map((t) => (
            <p key={t.id} className="text-sm text-muted-foreground">
              {WEEKDAY_LABELS[t.weekday] ?? t.weekday}: {t.name}
            </p>
          ))}
        </section>
      )}

      <section aria-label="Sessões geradas">
        <h2 className="text-sm font-medium text-foreground">Sessões</h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma sessão gerada ainda — salve o template semanal.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {s.date.slice(0, 10)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {SESSION_STATUS_LABELS[s.status] ?? s.status}
                    {s.overriddenFromTemplate ? " · modificada" : ""}
                  </span>
                </div>
                <ul className="mt-1 text-sm text-muted-foreground">
                  {s.sessionExercises.map((e) => (
                    <li key={e.id}>
                      {e.exerciseName} — {e.targetSets}x{e.targetRepsMin}
                      {e.targetRepsMax ? `-${e.targetRepsMax}` : ""}
                    </li>
                  ))}
                </ul>
                {canEdit ? (
                  <>
                    <SessionActions
                      sessionId={s.id}
                      currentDate={s.date}
                      cancelled={s.status === "CANCELLED"}
                    />
                    <Link
                      href={`/sessions/${s.id}/edit`}
                      className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
                    >
                      Editar exercícios desta sessão
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
