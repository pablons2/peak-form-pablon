import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import { getClientIntake, listClientIntakeVersions } from "@/features/intake/api-client";
import { IntakeSummary } from "@/features/intake/components/intake-summary";
import { AnnotationForm } from "@/features/intake/components/annotation-form";
import { INTAKE_STATUS_LABELS } from "@/features/intake/labels";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

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
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">⏳ Aguardando triagem do cliente</h2>
              <p className="mt-1 text-sm text-foreground">
                Este cliente ainda não iniciou a triagem de saúde. Você pode enviar um lembrete ou esperar pela resposta.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Link de triagem: <span className="font-mono text-foreground">/intake</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {planAssignmentAllowed ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">✅ Triagem Completa e Aprovada</h2>
                  <p className="mt-1 text-sm text-foreground">
                    O cliente completou a triagem de saúde. Você já pode criar planos de treino personalizados.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Versão {intake.version} — Liberado para atribuição de planos
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-info/40 bg-info/10 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">ℹ️ Triagem Submetida - Aguardando Revisão</h2>
                  <p className="mt-1 text-sm text-foreground">
                    O cliente enviou a triagem. Revise e aprove para liberar a criação de planos.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Versão {intake.version} — {INTAKE_STATUS_LABELS[intake.status] ?? intake.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-4">Respostas da Triagem</h3>
            <IntakeSummary intake={intake} />
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-4">Suas Anotações</h3>
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
