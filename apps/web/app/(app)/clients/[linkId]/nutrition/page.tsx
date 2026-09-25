import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import {
  getClientAdherenceHistory,
  getClientDiary,
  getClientPlan,
  getClientWeeklySummary,
  listClientPlans,
} from "@/features/nutrition/api-client";
import { AdherenceTrend } from "@/features/nutrition/components/adherence-trend";
import { FoodDiaryList } from "@/features/nutrition/components/food-diary-list";
import { MacroTotals } from "@/features/nutrition/components/macro-totals";
import { MealPlanView } from "@/features/nutrition/components/meal-plan-view";
import { NutritionPanelTabs } from "@/features/nutrition/components/nutrition-panel-tabs";
import { PlanHistoryList } from "@/features/nutrition/components/plan-history-list";
import { WeeklySummaryCard } from "@/features/nutrition/components/weekly-summary";

export const metadata = { title: "Nutrição do Cliente — PeakForm" };

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// PRD 08 §4/§5/§7 — the Nutritionist's acompanhamento panel for one linked
// Client: date-navigable diary (Hoje), the structured meal plan (Dieta),
// the 4-week adherence trend (Aderência) and the plan history (Histórico).
// Same "filter the caller's own links list" access pattern every other
// /clients/[linkId]/* page uses.
export default async function ClientNutritionPage({
  params,
  searchParams,
}: {
  params: { linkId: string };
  searchParams: { date?: string };
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

  // A malformed ?date= just falls back to today — never a 500.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "")
    ? searchParams.date!
    : todayIso();

  const [planResult, diaryResult, summaryResult, historyResult, plansResult] =
    await Promise.all([
      getClientPlan(accessToken, link.client.id),
      getClientDiary(accessToken, link.client.id, date),
      getClientWeeklySummary(accessToken, link.client.id),
      getClientAdherenceHistory(accessToken, link.client.id),
      listClientPlans(accessToken, link.client.id),
    ]);

  const plan = planResult.ok ? planResult.data.plan : null;
  const builderHref = `/clients/${link.id}/nutrition/plan`;

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

      <NutritionPanelTabs
        hoje={
          <>
            <div className="mb-3 flex items-center justify-between">
              <Link
                href={`/clients/${link.id}/nutrition?date=${shiftDate(date, -1)}`}
                className="text-sm text-accent hover:underline"
                aria-label="Dia anterior"
              >
                ← Anterior
              </Link>
              <span className="text-sm text-muted-foreground">
                {new Date(`${date}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {date < todayIso() ? (
                <Link
                  href={`/clients/${link.id}/nutrition?date=${shiftDate(date, 1)}`}
                  className="text-sm text-accent hover:underline"
                  aria-label="Próximo dia"
                >
                  Próximo →
                </Link>
              ) : (
                <span className="w-px" aria-hidden="true" />
              )}
            </div>

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground">Consumo do dia</h2>
              <div className="mt-3">
                {diaryResult.ok ? (
                  <MacroTotals result={diaryResult.data} />
                ) : (
                  <p className="text-sm text-destructive">
                    Não foi possível carregar o diário deste dia.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground">Refeições registradas</h2>
              <div className="mt-3">
                <FoodDiaryList entries={diaryResult.ok ? diaryResult.data.entries : []} />
              </div>
            </section>
          </>
        }
        dieta={
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {plan
                  ? plan.status === "DRAFT"
                    ? "Rascunho — invisível ao cliente até a confirmação."
                    : "Plano ativo do cliente."
                  : "Nenhum plano gerado ainda."}
              </p>
              <Link href={builderHref} className="text-sm text-accent hover:underline">
                Montar / editar dieta
              </Link>
            </div>
            {plan ? (
              <MealPlanView plan={plan} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Gere a estimativa inicial (Mifflin-St Jeor) e monte as refeições.
              </p>
            )}
          </>
        }
        adherencia={
          <>
            {summaryResult.ok ? <WeeklySummaryCard summary={summaryResult.data} /> : null}
            <section className="mt-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium text-foreground">Tendência (4 semanas)</h2>
              <div className="mt-3">
                {historyResult.ok ? (
                  <AdherenceTrend history={historyResult.data} />
                ) : (
                  <p className="text-sm text-destructive">
                    Não foi possível carregar o histórico de aderência.
                  </p>
                )}
              </div>
            </section>
          </>
        }
        historico={
          <PlanHistoryList
            plans={plansResult.ok ? plansResult.data.plans : []}
            builderHref={builderHref}
          />
        }
      />
    </main>
  );
}
