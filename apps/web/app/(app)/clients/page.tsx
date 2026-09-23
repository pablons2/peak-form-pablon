import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { fetchMe } from "@/features/auth/api-client";
import { authOptions } from "@/features/auth/nextauth-options";
import {
  listMyLinks,
  listCheckInSchedules,
  getClientIntake,
  type PublicLink,
} from "@/features/relationships/api-client";
import { listClientTrainingPlans } from "@/features/training-plans/api-client";
import { ClientRosterRow } from "@/features/relationships/components/client-roster-row";
import { InviteClientForm } from "@/features/relationships/components/invite-client-form";
import { ClientDetailTabs } from "@/features/client-detail-hub/components/client-detail-tabs";
import { OverviewTab } from "@/features/client-detail-hub/components/overview-tab";
import { TrainingPlansTab } from "@/features/client-detail-hub/components/training-plans-tab";
import { LinkedSectionTab } from "@/features/client-detail-hub/components/linked-section-tab";
import { CheckInsPanel } from "@/features/relationships/components/check-ins-panel";

export const metadata = { title: "Meus Clientes — PeakForm" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { selected?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/dashboard");
  if (session.user.approvalStatus !== "APPROVED") redirect("/pending-approval");

  const accessToken = session.accessToken!;
  const [me, result] = await Promise.all([
    fetchMe(accessToken),
    listMyLinks(accessToken),
  ]);
  const links: PublicLink[] = result.ok ? result.data : [];

  const active = links.filter((l) => l.status === "ACTIVE");
  const pending = links.filter((l) => l.status === "PENDING");

  const selectedLink = searchParams.selected
    ? links.find((l) => l.id === searchParams.selected)
    : null;

  const selectedSchedules = selectedLink
    ? await listCheckInSchedules(accessToken, selectedLink.id).then((r) =>
        r.ok ? r.data : [],
      )
    : [];

  const selectedIntake = selectedLink
    ? await getClientIntake(accessToken, selectedLink.id).then((r) =>
        r.ok ? r.data.intake : null,
      )
    : null;

  // Fetch training plans for the selected client if applicable
  const selectedPlans = selectedLink && selectedLink.specialization === "PERSONAL_TRAINER"
    ? await listClientTrainingPlans(accessToken, selectedLink.client.id).then((r) =>
        r.ok ? r.data : [],
      )
    : [];

  return (
    <main className="mx-auto p-4 lg:grid lg:max-w-full lg:grid-cols-[320px_1fr] lg:gap-4">
      <div className="space-y-6 lg:overflow-y-auto lg:max-h-screen">
        <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-4">
          <h1 className="text-lg font-semibold text-foreground">Meus Clientes</h1>
          <Link href="/dashboard" className="text-sm text-accent hover:underline">
            Voltar
          </Link>
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Convidar cliente</h2>
          <div className="mt-3">
            <InviteClientForm
              ownSpecializations={me?.professional?.specializations ?? []}
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground">Pendentes</h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum convite ou solicitação pendente.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pending.map((link) => (
                <ClientRosterRow key={link.id} link={link} viewerId={session.user.id!} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground">Ativos</h2>
          {active.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum cliente ativo ainda.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {active.map((link) => (
                <ClientRosterRow
                  key={link.id}
                  link={link}
                  viewerId={session.user.id!}
                  isSelected={selectedLink?.id === link.id}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {selectedLink && (
        <div className="mt-6 space-y-6 lg:mt-0 lg:border-l lg:border-border lg:pl-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedLink.client.fullName}
            </h2>
            <Link href="/clients" className="text-sm text-accent hover:underline">
              ✕
            </Link>
          </div>

          <ClientDetailTabs
            overview={<OverviewTab link={selectedLink} schedules={selectedSchedules} intake={selectedIntake} viewerId={session.user.id!} />}
            treino={
              selectedLink.specialization === "PERSONAL_TRAINER" ? (
                <TrainingPlansTab linkId={selectedLink.id} plans={selectedPlans} />
              ) : (
                <LinkedSectionTab
                  linkId={selectedLink.id}
                  sectionName="Nutrição"
                  href={`/clients/${selectedLink.id}/nutrition`}
                />
              )
            }
            nutricao={
              selectedLink.specialization === "NUTRITIONIST" ? (
                <LinkedSectionTab
                  linkId={selectedLink.id}
                  sectionName="Nutrição"
                  href={`/clients/${selectedLink.id}/nutrition`}
                />
              ) : (
                <LinkedSectionTab
                  linkId={selectedLink.id}
                  sectionName="Nutrição"
                  href={`/clients/${selectedLink.id}/nutrition`}
                />
              )
            }
            avaliacoes={
              <LinkedSectionTab
                linkId={selectedLink.id}
                sectionName="Avaliação Corporal"
                href={`/clients/${selectedLink.id}/body-assessments`}
              />
            }
            mensagens={
              <LinkedSectionTab
                linkId={selectedLink.id}
                sectionName="Mensagens"
                href={`/messages/with/${selectedLink.client.id}`}
              />
            }
          />

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-foreground">Check-ins</h2>
            <div className="mt-3">
              <CheckInsPanel
                linkId={selectedLink.id}
                schedules={selectedSchedules}
                canManage={selectedLink.status === "ACTIVE"}
              />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
