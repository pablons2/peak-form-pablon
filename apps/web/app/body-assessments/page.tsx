import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getMyBodyAssessmentsAction } from "@/features/body-assessments/actions";
import { SelfLogForm } from "@/features/body-assessments/components/self-log-form";
import { BodyAssessmentList } from "@/features/body-assessments/components/body-assessment-list";
import { TrendChart } from "@/features/body-assessments/components/trend-chart";
import { PhotoComparison } from "@/features/body-assessments/components/photo-comparison";

export const metadata = { title: "Avaliação Corporal — PeakForm" };

// PRD 04 §4/§5.1/§7 — the Client's own body-assessment history: the quick
// self-log at the top (under-15s target), then the append-only timeline,
// weight trend, and photo comparison below.
export default async function BodyAssessmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const entries = await getMyBodyAssessmentsAction();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Avaliação corporal
        </h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Registro rápido</h2>
        <div className="mt-2">
          <SelfLogForm />
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
