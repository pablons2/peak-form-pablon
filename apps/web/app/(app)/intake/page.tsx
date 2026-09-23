import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getMyIntake, startOrResumeIntake } from "@/features/intake/api-client";
import { IntakeWizard } from "@/features/intake/components/intake-wizard";
import { IntakeSummary } from "@/features/intake/components/intake-summary";
import { StartNewIntakeVersionButton } from "@/features/intake/components/start-new-intake-version-button";
import { INTAKE_STATUS_LABELS } from "@/features/intake/labels";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export const metadata = { title: "Triagem de Saúde — PeakForm" };

// PRD 03 §4/§5.1 — the Client's own intake/onboarding flow: resumes an
// IN_PROGRESS draft into the wizard, or shows the latest finalized version's
// summary with the option to start a new one (§5.3 — never edited in place).
export default async function IntakePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const mine = await getMyIntake(accessToken);
  let intake = mine.ok ? mine.data.intake : null;
  const planAssignmentAllowed = mine.ok ? mine.data.planAssignmentAllowed : false;

  if (!intake || intake.status !== "IN_PROGRESS") {
    if (!intake) {
      const started = await startOrResumeIntake(accessToken);
      if (started.ok) intake = started.data;
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Triagem de saúde
        </h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      {!intake ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar a triagem — tente novamente.
        </p>
      ) : intake.status === "IN_PROGRESS" ? (
        <>
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-foreground">⏳ Complete sua triagem</h2>
                <p className="mt-1 text-sm text-foreground">
                  Você começou a triagem de saúde. Complete todas as seções abaixo para desbloquear seu programa personalizado.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <IntakeWizard intake={intake} />
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {planAssignmentAllowed ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">✅ Triagem Concluída</h2>
                  <p className="mt-1 text-sm text-foreground">
                    Sua triagem de saúde foi aprovada e seu profissional já pode criar seu plano personalizado!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-info/40 bg-info/10 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">ℹ️ Triagem Enviada</h2>
                  <p className="mt-1 text-sm text-foreground">
                    Sua triagem foi enviada para revisão. Seu profissional analisará em breve e entrará em contato se precisar de esclarecimentos.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Versão {intake.version} — {INTAKE_STATUS_LABELS[intake.status] ?? intake.status}
            </p>
            <div className="rounded-lg border border-border bg-card p-4">
              <IntakeSummary intake={intake} />
            </div>
          </div>
          <StartNewIntakeVersionButton />
        </div>
      )}
    </main>
  );
}
