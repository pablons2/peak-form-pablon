import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks } from "@/features/relationships/api-client";
import { getClientPlan, listClientPlans } from "@/features/nutrition/api-client";
import type { PublicNutritionPlan } from "@/features/nutrition/api-client";
import { MealPlanBuilder } from "@/features/nutrition/components/meal-plan-builder";

export const metadata = { title: "Montar Dieta — PeakForm" };

// PRD 08 §5.2 — the Nutritionist's structured meal-plan builder for one
// linked Client. Defaults to the latest plan (any status); `?planId=`
// opens a specific row from the history. Same "filter the caller's own
// links list" access pattern every other /clients/[linkId]/* page uses.
export default async function MealPlanBuilderPage({
  params,
  searchParams,
}: {
  params: { linkId: string };
  searchParams: { planId?: string };
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

  let plan: PublicNutritionPlan | null = null;
  if (searchParams.planId) {
    const plansResult = await listClientPlans(accessToken, link.client.id);
    plan = plansResult.ok
      ? (plansResult.data.plans.find((p) => p.id === searchParams.planId) ?? null)
      : null;
  } else {
    const planResult = await getClientPlan(accessToken, link.client.id);
    plan = planResult.ok ? planResult.data.plan : null;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Montar dieta — {link.client.fullName}
        </h1>
        <Link
          href={`/clients/${link.id}/nutrition`}
          className="text-sm text-accent hover:underline"
        >
          Voltar
        </Link>
      </div>

      <MealPlanBuilder key={plan?.id ?? "none"} clientId={link.client.id} plan={plan} />
    </main>
  );
}
