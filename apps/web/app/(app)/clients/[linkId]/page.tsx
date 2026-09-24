import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listCheckInSchedules, listMyLinks, getClientIntake } from "@/features/relationships/api-client";
import { listClientTrainingPlans } from "@/features/training-plans/api-client";
import { listClientSessions } from "@/features/client-training-execution/api-client";
import { getExercise } from "@/features/exercises/api-client";
import { ClientDetailTabs } from "@/features/client-detail-hub/components/client-detail-tabs";
import { OverviewTab } from "@/features/client-detail-hub/components/overview-tab";
import { TrainingPlansTab } from "@/features/client-detail-hub/components/training-plans-tab";
import { SessionReviewTab } from "@/features/client-detail-hub/components/session-review-tab";
import { LinkedSectionTab } from "@/features/client-detail-hub/components/linked-section-tab";
import { CheckInsPanel } from "@/features/relationships/components/check-ins-panel";

export const metadata = { title: "Detalhes do Cliente — PeakForm" };

export default async function ClientDetailPage({
  params,
}: {
  params: { linkId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/dashboard");
  if (session.user.approvalStatus !== "APPROVED") redirect("/pending-approval");

  const accessToken = session.accessToken!;
  const linksResult = await listMyLinks(accessToken);
  const link = linksResult.ok
    ? linksResult.data.find((l) => l.id === params.linkId)
    : undefined;
  if (!link) notFound();

  // getClientIntake takes the CLIENT id (GET /intake/clients/:clientId) —
  // passing the linkId here used to silently fail the link check and render
  // every client as "Triagem Pendente".
  const [schedulesResult, intakeResult] = await Promise.all([
    listCheckInSchedules(accessToken, params.linkId),
    getClientIntake(accessToken, link.client.id),
  ]);

  // Fetch training plans and sessions if this link is for a personal trainer
  const [plansResult, sessionsResult] = await Promise.all([
    link.specialization === "PERSONAL_TRAINER"
      ? listClientTrainingPlans(accessToken, link.client.id)
      : Promise.resolve({ ok: false as const }),
    link.specialization === "PERSONAL_TRAINER"
      ? listClientSessions(accessToken, link.client.id)
      : Promise.resolve({ ok: false as const }),
  ]);

  const plans = plansResult.ok ? plansResult.data : [];
  const sessions = sessionsResult.ok ? sessionsResult.data.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ) : [];
  
  // Fetch exercise details for all exercises in sessions
  const exerciseIds = new Set<string>();
  sessions.forEach(session => {
    session.exercises.forEach(ex => exerciseIds.add(ex.exerciseId));
  });
  
  const exerciseDetailsMap = new Map<string, any>();
  await Promise.all(
    Array.from(exerciseIds).map(async (exerciseId) => {
      const result = await getExercise(accessToken, exerciseId);
      if (result.ok) {
        exerciseDetailsMap.set(exerciseId, result.data);
      }
    })
  );

  const schedules = schedulesResult.ok ? schedulesResult.data : [];
  const intake = intakeResult.ok ? intakeResult.data.intake : null;

  return (
    <main className="mx-auto w-full p-4 lg:max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-foreground">
          {link.client.fullName}
        </h1>
        <Link href="/clients" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <div className="space-y-6">
        <ClientDetailTabs
          overview={
            <OverviewTab
              link={link}
              schedules={schedules}
              intake={intake}
              viewerId={session.user.id!}
              plansCount={plans.length}
            />
          }
          treino={
            link.specialization === "PERSONAL_TRAINER" ? (
              <TrainingPlansTab linkId={link.id} plans={plans} intake={intake} />
            ) : (
              <LinkedSectionTab
                linkId={link.id}
                sectionName="Nutrição"
                href={`/clients/${link.id}/nutrition`}
              />
            )
          }
          execucao={
            link.specialization === "PERSONAL_TRAINER" ? (
              <SessionReviewTab sessions={sessions} exercises={exerciseDetailsMap} />
            ) : undefined
          }
          execucaoCount={
            link.specialization === "PERSONAL_TRAINER" ? sessions.length : undefined
          }
          nutricao={
            link.specialization === "NUTRITIONIST" ? (
              <LinkedSectionTab
                linkId={link.id}
                sectionName="Nutrição"
                href={`/clients/${link.id}/nutrition`}
              />
            ) : (
              <LinkedSectionTab
                linkId={link.id}
                sectionName="Nutrição"
                href={`/clients/${link.id}/nutrition`}
              />
            )
          }
          avaliacoes={
            <LinkedSectionTab
              linkId={link.id}
              sectionName="Avaliação Corporal"
              href={`/clients/${link.id}/body-assessments`}
            />
          }
          mensagens={
            <LinkedSectionTab
              linkId={link.id}
              sectionName="Mensagens"
              href={`/messages/with/${link.client.id}`}
            />
          }
        />

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Check-ins</h2>
          <div className="mt-3">
            <CheckInsPanel
              linkId={link.id}
              schedules={schedules}
              canManage={link.status === "ACTIVE"}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
