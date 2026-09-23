import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getTodayDashboard, getWeekDashboard } from "@/features/dashboard/api-client";
import { TodayTrainingCard } from "@/features/dashboard/components/today-training-card";
import { TodayNutritionCard } from "@/features/dashboard/components/today-nutrition-card";
import { TodayMessagesCard } from "@/features/dashboard/components/today-messages-card";
import { CheckInDueCard } from "@/features/dashboard/components/check-in-due-card";
import { WeekStrip } from "@/features/dashboard/components/week-strip";
import { WeeklySummaryCard } from "@/features/dashboard/components/weekly-summary-card";
import { DashboardTabs } from "@/features/dashboard/components/dashboard-tabs";
import { TodayChecklist } from "@/features/habits/components/today-checklist";

export const metadata = { title: "Início — PeakForm" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // UX-layer routing convenience only — the API's ApprovalStatusGuard is the
  // real boundary once Professional-only endpoints exist (PRD 02/06).
  if (
    session.user.role === "PROFESSIONAL" &&
    session.user.approvalStatus !== "APPROVED"
  ) {
    redirect("/pending-approval");
  }

  // PRD 09 §4 — this module is Client-facing only. Professional/Admin keep
  // the plain navigation landing that predates this phase.
  if (session.user.role !== "CLIENT") {
    return <NavigationLanding role={session.user.role} name={session.user.name} />;
  }

  const accessToken = session.accessToken!;
  const [todayResult, weekResult] = await Promise.all([
    getTodayDashboard(accessToken),
    getWeekDashboard(accessToken),
  ]);

  if (!todayResult.ok || !weekResult.ok) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-destructive">
          Não foi possível carregar o painel agora. Tente novamente em instantes.
        </p>
      </main>
    );
  }

  const today = todayResult.data;
  const week = weekResult.data;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-semibold text-foreground">Olá, {session.user.name}!</h1>

      <DashboardTabs
        today={
          <div className="space-y-3">
            <TodayTrainingCard session={today.training.session} isRestDay={today.training.isRestDay} />
            <TodayNutritionCard diary={today.nutrition} />
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground">Hábitos e tarefas</h2>
              <div className="mt-2">
                <TodayChecklist habits={today.habits} tasks={today.tasks} />
              </div>
            </div>
            <TodayMessagesCard
              unreadTotal={today.messages.unreadTotal}
              unreadThreads={today.messages.unreadThreads}
            />
            <CheckInDueCard nextDueAt={today.checkInDue} />
          </div>
        }
        week={
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <WeekStrip strip={week.strip} />
            </div>
            <WeeklySummaryCard
              trainingAdherence={week.trainingAdherence}
              volumeTrend={week.volumeTrend}
              weightTrend={week.weightTrend}
            />
          </div>
        }
      />
    </main>
  );
}

// The pre-PRD-09 generic nav landing, kept for Professional/Admin — this
// module never had a role-specific version for them (§3 Non-Goals).
function NavigationLanding({
  role,
  name,
}: {
  role: "PROFESSIONAL" | "ADMIN" | undefined;
  name: string | null | undefined;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Olá, {name}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você está conectado como{" "}
          <span className="font-medium text-foreground">
            {role === "PROFESSIONAL" ? "profissional" : "administrador"}
          </span>
          .
        </p>
        {role === "PROFESSIONAL" ? (
          <p className="mt-4 text-sm">
            <Link href="/messages" className="text-accent hover:underline">
              Mensagens
            </Link>
          </p>
        ) : null}
        {role === "PROFESSIONAL" ? (
          <p className="mt-2 text-sm">
            <Link href="/clients" className="text-accent hover:underline">
              Meus Clientes
            </Link>
          </p>
        ) : null}
        <p className="mt-4 text-sm">
          <Link href="/exercises" className="text-accent hover:underline">
            Biblioteca de exercícios
          </Link>
        </p>
        <p className="mt-2 text-sm">
          <Link href="/plans/starter-templates" className="text-accent hover:underline">
            Modelos iniciais
          </Link>
        </p>
        {role === "ADMIN" ? (
          <p className="mt-2 text-sm">
            <Link href="/admin/exercises" className="text-accent hover:underline">
              Revisão de exercícios
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
