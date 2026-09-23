import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getToday, listHabits, listTasks } from "@/features/habits/api-client";
import { HabitManager } from "@/features/habits/components/habit-manager";
import { TaskManager } from "@/features/habits/components/task-manager";
import { TodayChecklist } from "@/features/habits/components/today-checklist";

export const metadata = { title: "Hábitos e tarefas — PeakForm" };

// PRD 10 — Client-only (§4: no Professional/Admin visibility into this
// module's data at all). Mirrors app/nutrition/page.tsx's role gate and
// section-card layout.
export default async function HabitsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const [todayResult, habitsResult, tasksResult] = await Promise.all([
    getToday(accessToken),
    listHabits(accessToken),
    listTasks(accessToken),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-lg font-semibold text-foreground">Hábitos e tarefas</h1>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Hoje</h2>
        <div className="mt-3">
          {todayResult.ok ? (
            <TodayChecklist habits={todayResult.data.habits} tasks={todayResult.data.tasks} />
          ) : (
            <p className="text-sm text-destructive">
              Não foi possível carregar o resumo de hoje.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Hábitos</h2>
        <div className="mt-3">
          {habitsResult.ok ? (
            <HabitManager habits={habitsResult.data} />
          ) : (
            <p className="text-sm text-destructive">Não foi possível carregar os hábitos.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Tarefas</h2>
        <div className="mt-3">
          {tasksResult.ok ? (
            <TaskManager tasks={tasksResult.data} />
          ) : (
            <p className="text-sm text-destructive">Não foi possível carregar as tarefas.</p>
          )}
        </div>
      </section>
    </main>
  );
}

