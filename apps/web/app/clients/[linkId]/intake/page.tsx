import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import { getClientIntake, listClientIntakeVersions } from "@/features/intake/api-client";
import { IntakeSummary } from "@/features/intake/components/intake-summary";
import { AnnotationForm } from "@/features/intake/components/annotation-form";
import { INTAKE_STATUS_LABELS } from "@/features/intake/labels";

export const metadata = { title: "Triagem do Cliente — PeakForm" };

// PRD 03 §4/§5.4 — a Professional's review of a linked Client's latest
// finalized intake, plus the version history (so a resubmission after a new
// injury is visible as a new row, not a silent edit) and the annotation
// form. Same "filter the caller's own links list" access pattern as
// /clients/[linkId] (PRD 02) — no dedicated GET /links/:id exists.
export default async function ClientIntakePage({
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

  const [intakeResult, versionsResult] = await Promise.all([
    getClientIntake(accessToken, link.client.id),
    listClientIntakeVersions(accessToken, link.client.id),
  ]);

  const intake = intakeResult.ok ? intakeResult.data.intake : null;
  const planAssignmentAllowed = intakeResult.ok
    ? intakeResult.data.planAssignmentAllowed
    : false;
  const versions = versionsResult.ok ? versionsResult.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Triagem de {link.client.fullName}
        </h1>
        <Link
          href={`/clients/${link.id}`}
          className="text-sm text-accent hover:underline"
        >
          Voltar
        </Link>
      </div>

      {!intake ? (
        <p className="text-sm text-muted-foreground">
          Este cliente ainda não concluiu nem pulou a triagem de saúde —
          aguardando.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Versão {intake.version} —{" "}
            {INTAKE_STATUS_LABELS[intake.status] ?? intake.status}
            {planAssignmentAllowed ? " — liberado para plano de treino." : ""}
          </p>
          <div className="rounded-lg border border-border bg-card p-4">
            <IntakeSummary intake={intake} />
          </div>
          <section className="rounded-lg border border-border bg-card p-4">
            <AnnotationForm intakeAssessmentId={intake.id} />
          </section>
        </>
      )}

      {versions.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-foreground">
            Histórico de versões
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {versions.map((v) => (
              <li key={v.id}>
                Versão {v.version} — {INTAKE_STATUS_LABELS[v.status] ?? v.status}
                {v.annotations && v.annotations.length > 0
                  ? ` — ${v.annotations.length} anotação(ões)`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
