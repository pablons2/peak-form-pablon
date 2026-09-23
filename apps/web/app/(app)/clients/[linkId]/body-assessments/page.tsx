import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import { getClientBodyAssessmentsAction } from "@/features/body-assessments/actions";
import { FormalAssessmentForm } from "@/features/body-assessments/components/formal-assessment-form";
import { BodyAssessmentList } from "@/features/body-assessments/components/body-assessment-list";
import { TrendChart } from "@/features/body-assessments/components/trend-chart";
import { PhotoComparison } from "@/features/body-assessments/components/photo-comparison";

export const metadata = { title: "Avaliação Corporal do Cliente — PeakForm" };

// PRD 04 §4/§5.2/§7 — a Professional's (own linked Client) formal-assessment
// authoring + that Client's full history. Same "filter the caller's own
// links list" access pattern as /clients/[linkId]/intake — no dedicated
// GET /links/:id exists.
export default async function ClientBodyAssessmentsPage({
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

  const entries = await getClientBodyAssessmentsAction(link.client.id);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Avaliação corporal de {link.client.fullName}
        </h1>
        <Link
          href={`/clients/${link.id}`}
          className="text-sm text-accent hover:underline"
        >
          Voltar
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Recomendação: uma avaliação formal a cada 4–6 semanas, alinhada a um
        mesociclo típico — variações de composição corporal não são
        confiáveis em ciclos mais curtos. Meça em horário consistente
        (idealmente em jejum, pela manhã), preferencialmente com o mesmo
        avaliador, lado e pontos de referência.
      </p>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">
          Nova avaliação formal
        </h2>
        <div className="mt-3">
          <FormalAssessmentForm clientId={link.client.id} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Tendência de peso</h2>
        <div className="mt-3">
          <TrendChart
            points={entries.map((e) => ({
              recordedAt: e.recordedAt,
              value: e.weight,
              source: e.source,
              protocolVersion: e.protocolVersion,
            }))}
            label="Peso"
            unit="kg"
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Fotos</h2>
        <div className="mt-3">
          <PhotoComparison entries={entries} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Histórico</h2>
        <div className="mt-2">
          <BodyAssessmentList entries={entries} />
        </div>
      </section>
    </main>
  );
}
