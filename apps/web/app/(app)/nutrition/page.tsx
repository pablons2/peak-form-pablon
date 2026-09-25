import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import {
  getMyAdherenceHistory,
  getMyDiary,
  getMyHydration,
  getMyPlan,
  getMyWeeklySummary,
} from "@/features/nutrition/api-client";
import { AdherenceTrend } from "@/features/nutrition/components/adherence-trend";
import { FoodDiaryList } from "@/features/nutrition/components/food-diary-list";
import { FoodDiaryLogger } from "@/features/nutrition/components/food-diary-logger";
import { HydrationCounter } from "@/features/nutrition/components/hydration-counter";
import { MacroTotals } from "@/features/nutrition/components/macro-totals";
import { MealPlanView } from "@/features/nutrition/components/meal-plan-view";
import { WeeklySummaryCard } from "@/features/nutrition/components/weekly-summary";

export const metadata = { title: "Nutrição — PeakForm" };

// PRD 08 §5.3/§5.4/§7 — the Client's own food diary, hydration counter,
// macro totals, and now the ACTIVE diet plan itself ("Minha dieta") plus
// the 4-week adherence trend. This page's data source (getMyDiary/
// getMyPlan-shaped endpoints) is structurally incapable of ever returning a
// DRAFT plan — see the backend's own contract — so there is no path here
// that could leak an unconfirmed target (§7).
export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const [diaryResult, hydrationResult, summaryResult, planResult, historyResult] =
    await Promise.all([
      getMyDiary(accessToken),
      getMyHydration(accessToken),
      getMyWeeklySummary(accessToken),
      getMyPlan(accessToken),
      getMyAdherenceHistory(accessToken),
    ]);

  const plan = planResult.ok ? planResult.data.plan : null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-lg font-semibold text-foreground">Nutrição</h1>

      {plan ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Minha dieta</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Plano ativo — {plan.calorieTarget} kcal/dia. Toque em &quot;Registrar&quot; num
            alimento para lançá-lo no diário.
          </p>
          <div className="mt-3">
            <MealPlanView plan={plan} showQuickLog />
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Minha dieta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu nutricionista ainda não confirmou um plano alimentar — as metas aparecem aqui
            assim que ele confirmar.
          </p>
        </section>
      )}

      {summaryResult.ok ? <WeeklySummaryCard summary={summaryResult.data} /> : null}

      {historyResult.ok && historyResult.data.weeks.some((w) => w.daysLogged > 0) ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Aderência (4 semanas)</h2>
          <div className="mt-3">
            <AdherenceTrend history={historyResult.data} />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Hoje</h2>
        <div className="mt-3">
          {diaryResult.ok ? (
            <MacroTotals result={diaryResult.data} />
          ) : (
            <p className="text-sm text-destructive">Não foi possível carregar seu diário.</p>
          )}
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
