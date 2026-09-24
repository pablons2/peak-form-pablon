import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { getExercise } from "@/features/exercises/api-client";
import {
  getMySessionsAction,
  getTodaySessionAction,
} from "@/features/client-training-execution/actions";
import { TodaySessionView } from "@/features/client-training-execution/components/today-session-view";
import { SessionHistoryList } from "@/features/client-training-execution/components/session-history-list";

export const metadata = { title: "Treino de hoje — PeakForm" };

// PRD 07 §5.1/§7 — the Client's highest-frequency screen: today's session
// (or a clear rest-day state) plus a compact history below it. Client-only;
// Professionals get their own read-only view at
// /clients/[linkId]/training-execution.
export default async function TodayPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const [today, history] = await Promise.all([
    getTodaySessionAction(),
    getMySessionsAction(),
  ]);

  const exerciseMedia: Record<string, string | null> = {};
  if (today.session) {
    const results = await Promise.all(
      today.session.exercises.map((e) => getExercise(accessToken, e.exerciseId)),
    );
    today.session.exercises.forEach((e, i) => {
      const result = results[i];
      exerciseMedia[e.exerciseId] = result?.ok ? result.data.mediaUrl : null;
    });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 lg:max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Treino de hoje</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Início
        </Link>
      </div>

      {/* Mobile: session stacks above history. Desktop (lg): session left,
          history right — the logging column stays the widest. */}
      <div className="space-y-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-8 lg:space-y-0">
        <div className="lg:col-span-3">
          {today.session ? (
            <TodaySessionView session={today.session} exerciseMedia={exerciseMedia} />
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground">Dia de descanso</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Não há treino agendado para hoje.
              </p>
            </div>
          )}
        </div>

        <section className="lg:col-span-2">
          <h2 className="text-sm font-medium text-foreground">Histórico</h2>
          <div className="mt-2">
            <SessionHistoryList sessions={history} />
          </div>
        </section>
      </div>
    </main>
  );
}
