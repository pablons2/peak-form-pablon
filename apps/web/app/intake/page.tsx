import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getMyIntake, startOrResumeIntake } from "@/features/intake/api-client";
import { IntakeWizard } from "@/features/intake/components/intake-wizard";
import { IntakeSummary } from "@/features/intake/components/intake-summary";
import { StartNewIntakeVersionButton } from "@/features/intake/components/start-new-intake-version-button";
import { INTAKE_STATUS_LABELS } from "@/features/intake/labels";

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
        <div className="rounded-lg border border-border bg-card p-4">
          <IntakeWizard intake={intake} />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Versão {intake.version} —{" "}
            {INTAKE_STATUS_LABELS[intake.status] ?? intake.status}
            {planAssignmentAllowed ? " — liberado para plano de treino." : ""}
          </p>
          <div className="rounded-lg border border-border bg-card p-4">
            <IntakeSummary intake={intake} />
          </div>
          <StartNewIntakeVersionButton />
        </div>
      )}
    </main>
  );
}
