import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getMyDiary, getMyHydration, getMyWeeklySummary } from "@/features/nutrition/api-client";
import { FoodDiaryLogger } from "@/features/nutrition/components/food-diary-logger";
import { FoodDiaryList } from "@/features/nutrition/components/food-diary-list";
import { HydrationCounter } from "@/features/nutrition/components/hydration-counter";
import { MacroTotals } from "@/features/nutrition/components/macro-totals";
import { WeeklySummaryCard } from "@/features/nutrition/components/weekly-summary";

export const metadata = { title: "Nutrição — PeakForm" };

// PRD 08 §5.3/§5.4/§7 — the Client's own food diary, hydration counter, and
// macro totals vs. whatever ACTIVE target exists. This page's data source
// (getMyDiary/getMyPlan-shaped endpoints) is structurally incapable of ever
// returning a DRAFT plan — see the backend's own contract — so there is no
// path here that could leak an unconfirmed target (§7).
export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const [diaryResult, hydrationResult, summaryResult] = await Promise.all([
    getMyDiary(accessToken),
    getMyHydration(accessToken),
    getMyWeeklySummary(accessToken),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-lg font-semibold text-foreground">Nutrição</h1>

      {summaryResult.ok ? <WeeklySummaryCard summary={summaryResult.data} /> : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Hoje</h2>
        <div className="mt-3">
          {diaryResult.ok ? <MacroTotals result={diaryResult.data} /> : null}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Hidratação</h2>
        <div className="mt-3">
          <HydrationCounter initialAmount={hydrationResult.ok ? hydrationResult.data.amount : 0} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Registrar alimento</h2>
        <div className="mt-3">
          <FoodDiaryLogger />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Refeições de hoje</h2>
        <div className="mt-3">
          <FoodDiaryList entries={diaryResult.ok ? diaryResult.data.entries : []} />
        </div>
      </section>
    </main>
  );
}
