import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import { getClientSessionsAction } from "@/features/client-training-execution/actions";
import { SessionHistoryList } from "@/features/client-training-execution/components/session-history-list";

export const metadata = { title: "Execução do Cliente — PeakForm" };

// PRD 07 §4 — a Professional's read-only view of a linked Client's
// execution history. Same "filter the caller's own links list" access
// pattern as /clients/[linkId]/intake and /clients/[linkId]/body-assessments
// — no dedicated GET /links/:id exists. There is no logging/editing UI here
// at all: the API has no mutating route a Professional could even hit
// (§4's "Professional ❌" rows), so there is nothing for this page to offer
// beyond the read.
export default async function ClientTrainingExecutionPage({
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

  const sessions = await getClientSessionsAction(link.client.id);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Execução de {link.client.fullName}
        </h1>
        <Link href={`/clients/${link.id}`} className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-medium text-foreground">Histórico de sessões</h2>
        <div className="mt-2">
          <SessionHistoryList sessions={sessions} />
        </div>
      </section>
    </main>
  );
}
