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
import { ClientRosterRow } from "@/features/relationships/components/client-roster-row";
import { InviteClientForm } from "@/features/relationships/components/invite-client-form";
import { OverviewTab } from "@/features/client-detail-hub/components/overview-tab";

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
        <div className="mt-6 lg:mt-0 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
          <div className="flex items-center justify-between lg:mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedLink.client.fullName}
            </h2>
            <Link href="/clients" className="text-sm text-accent hover:underline">
              ✕
            </Link>
          </div>
          <OverviewTab
            link={selectedLink}
            schedules={selectedSchedules}
            intake={selectedIntake}
            viewerId={session.user.id!}
          />
        </div>
      )}
    </main>
  );
}
