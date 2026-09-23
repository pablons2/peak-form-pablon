import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listCheckInSchedules, listMyLinks, getClientIntake } from "@/features/relationships/api-client";
import { listClientTrainingPlans } from "@/features/training-plans/api-client";
import { ClientDetailTabs } from "@/features/client-detail-hub/components/client-detail-tabs";
import { OverviewTab } from "@/features/client-detail-hub/components/overview-tab";
import { TrainingPlansTab } from "@/features/client-detail-hub/components/training-plans-tab";
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
  const [linksResult, schedulesResult, intakeResult] = await Promise.all([
    listMyLinks(accessToken),
    listCheckInSchedules(accessToken, params.linkId),
    getClientIntake(accessToken, params.linkId),
  ]);

  const link = linksResult.ok
    ? linksResult.data.find((l) => l.id === params.linkId)
    : undefined;
  if (!link) notFound();

  // Fetch training plans if this link is for a personal trainer
  const plansResult = link.specialization === "PERSONAL_TRAINER"
    ? await listClientTrainingPlans(accessToken, link.client.id)
    : { ok: false as const };

  const plans = plansResult.ok ? plansResult.data : [];
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
          overview={<OverviewTab link={link} schedules={schedules} intake={intake} viewerId={session.user.id!} />}
          treino={
            link.specialization === "PERSONAL_TRAINER" ? (
              <TrainingPlansTab linkId={link.id} plans={plans} />
            ) : (
              <LinkedSectionTab
                linkId={link.id}
                sectionName="Nutrição"
                href={`/clients/${link.id}/nutrition`}
              />
            )
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
