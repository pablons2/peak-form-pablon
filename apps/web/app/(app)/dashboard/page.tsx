import { getServerSession } from "next-auth";
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
import { IntakeStatusCard } from "@/features/intake/components/intake-status-card";
import { getMyIntake } from "@/features/intake/api-client";
import {
  ProfessionalDashboard,
  type UnscheduledClient,
  type ContraindicatedClient,
} from "@/features/dashboard/components/professional-dashboard";
import { AdminDashboard } from "@/features/dashboard/components/admin-dashboard";
import {
  listCheckInSchedules,
  listMyLinks,
  getClientIntake,
  type PublicLink,
} from "@/features/relationships/api-client";
import { listMyThreads } from "@/features/messaging/api-client";
import { getAnalytics, listPendingProfessionals } from "@/features/admin/api-client";
import { adminListExercises } from "@/features/exercises/api-client";

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

  // PRD 09 §4 — this module is Client-facing only. Professional/Admin get
  // the command-center home from docs/redesign-plan.md §5.3 instead of the
  // Today/Week tabs above (which need PRD 09 endpoints only Clients have).
  if (session.user.role === "PROFESSIONAL") {
    return <ProfessionalDashboardPage accessToken={session.accessToken!} name={session.user.name} />;
  }
  if (session.user.role === "ADMIN") {
    return <AdminDashboardPage accessToken={session.accessToken!} />;
  }

  const accessToken = session.accessToken!;
  const [todayResult, weekResult, intakeResult] = await Promise.all([
    getTodayDashboard(accessToken),
    getWeekDashboard(accessToken),
    getMyIntake(accessToken),
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
  const intake = intakeResult.ok ? intakeResult.data.intake : null;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-semibold text-foreground">Olá, {session.user.name}!</h1>

      <IntakeStatusCard intake={intake} />

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

// docs/redesign-plan.md §5.3 — every count here comes from an endpoint that
// already existed for its own screen (§7: no new backend work).
// unscheduledClients is the one derived value: each active link's own
// schedules, fetched in parallel, filtered to links with no currently-ACTIVE
// schedule (see professional-dashboard.tsx's comment on why "ACTIVE with a
// past nextDueAt" — this component's first cut — is a transient state PRD
// 02 §5.6's due-job clears almost immediately, not a useful signal).
async function ProfessionalDashboardPage({
  accessToken,
  name,
}: {
  accessToken: string;
  name: string | null | undefined;
}) {
  const linksResult = await listMyLinks(accessToken);
  const links: PublicLink[] = linksResult.ok ? linksResult.data : [];
  const active = links.filter((l) => l.status === "ACTIVE");
  const pending = links.filter((l) => l.status === "PENDING");
  const incomingRequests = pending.filter((l) => l.invitedBy === "CLIENT");

  const [threadsResult, scheduleResults, intakeResults] = await Promise.all([
    listMyThreads(accessToken),
    Promise.all(active.map((link) => listCheckInSchedules(accessToken, link.id))),
    // Same intake endpoint /clients uses for its roster flag — the client's
    // User id, not the link id (GET /intake/clients/:clientId).
    Promise.all(active.map((link) => getClientIntake(accessToken, link.client.id))),
  ]);

  const threadsWithUnread = threadsResult.ok
    ? threadsResult.data.threads.filter((t) => t.unreadCount > 0)
    : [];

  const unscheduledClients: UnscheduledClient[] = active.flatMap((link, index) => {
    const result = scheduleResults[index];
    if (!result?.ok) return [];
    const hasActiveSchedule = result.data.some((s) => s.status === "ACTIVE");
    return hasActiveSchedule ? [] : [{ linkId: link.id, clientName: link.client.fullName }];
  });

  const contraindicatedClients: ContraindicatedClient[] = active.flatMap((link, index) => {
    const result = intakeResults[index];
    if (!result?.ok) return [];
    const tags = result.data.intake?.contraindicationTagCodes ?? [];
    return tags.length > 0
      ? [{ linkId: link.id, clientName: link.client.fullName, tagCount: tags.length }]
      : [];
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-semibold text-foreground">Olá, {name}!</h1>
      <ProfessionalDashboard
        active={active}
        pending={pending}
        incomingRequests={incomingRequests}
        unscheduledClients={unscheduledClients}
        threadsWithUnread={threadsWithUnread}
        contraindicatedClients={contraindicatedClients}
      />
    </main>
  );
}

// docs/redesign-plan.md §5.3 "Admin variant" — pendingApprovals/pendingExercises
// reuse the same endpoints /admin/approvals and /admin/exercises already call;
// analytics reuses /admin/analytics. A failed analytics fetch degrades to
// hiding that section rather than failing the whole dashboard.
async function AdminDashboardPage({ accessToken }: { accessToken: string }) {
  const [approvalsResult, exercisesResult, analyticsResult] = await Promise.all([
    listPendingProfessionals(accessToken),
    adminListExercises(accessToken, "PRIVATE"),
    getAnalytics(accessToken),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-semibold text-foreground">Painel do administrador</h1>
      <AdminDashboard
        pendingApprovals={approvalsResult.ok ? approvalsResult.data.length : 0}
        pendingExercises={exercisesResult.ok ? exercisesResult.data.length : 0}
        analytics={analyticsResult.ok ? analyticsResult.data : null}
      />
    </main>
  );
}
