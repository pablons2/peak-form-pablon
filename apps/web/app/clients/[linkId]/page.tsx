import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listCheckInSchedules, listMyLinks } from "@/features/relationships/api-client";
import { LinkCard } from "@/features/relationships/components/link-card";
import { CheckInsPanel } from "@/features/relationships/components/check-ins-panel";

export const metadata = { title: "Detalhes do Cliente — PeakForm" };

// PRD 02 §7 — Professional's client-detail view: the relationship itself
// (with unlink) and the "Check-ins" panel (create/edit/cancel schedules for
// this link). No dedicated GET /links/:id exists yet — the caller's own
// links list (already scoped server-side to this Professional) is filtered
// to the requested id, so a client detail page can't be used to probe a link
// that isn't the Professional's own.
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
  const [linksResult, schedulesResult] = await Promise.all([
    listMyLinks(accessToken),
    listCheckInSchedules(accessToken, params.linkId),
  ]);

  const link = linksResult.ok
    ? linksResult.data.find((l) => l.id === params.linkId)
    : undefined;
  if (!link) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          {link.client.fullName}
        </h1>
        <Link href="/clients" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <ul>
        <LinkCard link={link} viewerId={session.user.id!} />
      </ul>

      <p className="text-sm">
        <Link href={`/clients/${link.id}/intake`} className="text-accent hover:underline">
          Ver triagem de saúde →
        </Link>
      </p>

      {link.specialization === "PERSONAL_TRAINER" ? (
        <p className="text-sm">
          <Link href={`/clients/${link.id}/plans`} className="text-accent hover:underline">
            Ver planos de treino →
          </Link>
        </p>
      ) : null}

      {link.specialization === "PERSONAL_TRAINER" ? (
        <p className="text-sm">
          <Link
            href={`/clients/${link.id}/training-execution`}
            className="text-accent hover:underline"
          >
            Ver execução dos treinos →
          </Link>
        </p>
      ) : null}

      <p className="text-sm">
        <Link
          href={`/clients/${link.id}/body-assessments`}
          className="text-accent hover:underline"
        >
          Ver avaliação corporal →
        </Link>
      </p>

      {link.specialization === "NUTRITIONIST" ? (
        <p className="text-sm">
          <Link href={`/clients/${link.id}/nutrition`} className="text-accent hover:underline">
            Ver nutrição →
          </Link>
        </p>
      ) : null}

      <p className="text-sm">
        <Link href={`/messages/with/${link.client.id}`} className="text-accent hover:underline">
          Ver mensagens →
        </Link>
      </p>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Check-ins</h2>
        <div className="mt-3">
          <CheckInsPanel
            linkId={link.id}
            schedules={schedulesResult.ok ? schedulesResult.data : []}
            canManage={link.status === "ACTIVE"}
          />
        </div>
      </section>
    </main>
  );
}
