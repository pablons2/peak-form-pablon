import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import {
  getClientDiary,
  getClientPlan,
  getClientWeeklySummary,
} from "@/features/nutrition/api-client";
import { DraftReviewForm } from "@/features/nutrition/components/draft-review-form";
import { FoodDiaryList } from "@/features/nutrition/components/food-diary-list";
import { MacroTotals } from "@/features/nutrition/components/macro-totals";
import { WeeklySummaryCard } from "@/features/nutrition/components/weekly-summary";

export const metadata = { title: "Nutrição do Cliente — PeakForm" };

// PRD 08 §4/§5.1/§5.2/§7 — a Nutritionist's (own linked Client) draft
// review/confirm screen + that Client's read-only food diary. Same
// "filter the caller's own links list" access pattern every other
// /clients/[linkId]/* page uses — no dedicated GET /links/:id exists.
export default async function ClientNutritionPage({
  params,
}: {
  params: { linkId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  if (session.user.role === "PROFESSIONAL" && session.user.approvalStatus !== "APPROVED") {
    redirect("/pending-approval");
  }

  const accessToken = session.accessToken!;
  const linksResult = await listMyLinks(accessToken);
  const link = linksResult.ok
    ? linksResult.data.find((l) => l.id === params.linkId)
    : undefined;
  if (!link) notFound();

  const [planResult, diaryResult, summaryResult] = await Promise.all([
    getClientPlan(accessToken, link.client.id),
    getClientDiary(accessToken, link.client.id),
    getClientWeeklySummary(accessToken, link.client.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Nutrição de {link.client.fullName}
        </h1>
        <Link href={`/clients/${link.id}`} className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Meta calórica/macro</h2>
        <div className="mt-3">
          <DraftReviewForm
            // Keyed on the plan's id (or "none") so generating a fresh
            // draft — which changes plan identity from null to a new row
            // with server-computed calorieTarget/macroTargets — remounts
            // the form instead of keeping stale (empty) input state from
            // before the draft existed. Confirming an existing draft keeps
            // the same id, so the form's edited values survive that step
            // as intended.
            key={planResult.ok ? (planResult.data.plan?.id ?? "none") : "none"}
            clientId={link.client.id}
            plan={planResult.ok ? planResult.data.plan : null}
          />
        </div>
      </section>

      {summaryResult.ok ? <WeeklySummaryCard summary={summaryResult.data} /> : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Diário de hoje (somente leitura)</h2>
        <div className="mt-3 space-y-3">
          {diaryResult.ok ? <MacroTotals result={diaryResult.data} /> : null}
          <FoodDiaryList entries={diaryResult.ok ? diaryResult.data.entries : []} />
        </div>
      </section>
    </main>
  );
}
