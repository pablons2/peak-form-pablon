import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getAnalytics } from "@/features/admin/api-client";
import { ADMIN_LABELS } from "@/features/admin/labels";
import { SPECIALIZATION_LABELS } from "@/features/relationships/labels";

export const metadata = { title: "Análises — PeakForm" };

function percentOrNoData(value: number | null) {
  return value === null ? ADMIN_LABELS.noData : `${value}%`;
}

// PRD 13 §5.6 — aggregate, non-per-client usage analytics.
export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const result = await getAnalytics(session.accessToken!);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-destructive">{ADMIN_LABELS.loadError}</p>
      </main>
    );
  }

  const analytics = result.data;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{ADMIN_LABELS.analyticsTitle}</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{ADMIN_LABELS.activeClients}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {analytics.activeClients}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{ADMIN_LABELS.activeProfessionals}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {analytics.activeProfessionals.total}
          </p>
          {Object.keys(analytics.activeProfessionals.bySpecialization).length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {Object.entries(analytics.activeProfessionals.bySpecialization)
                .map(([spec, count]) => `${SPECIALIZATION_LABELS[spec] ?? spec}: ${count}`)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{ADMIN_LABELS.avgTrainingAdherence}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {percentOrNoData(analytics.averageWeeklyTrainingAdherencePercent)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{ADMIN_LABELS.avgNutritionAdherence}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {percentOrNoData(analytics.averageWeeklyNutritionAdherencePercent)}
          </p>
        </div>
      </div>
    </main>
  );
}
