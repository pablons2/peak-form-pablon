// PRD 08 §5.2/§7 — the acompanhamento panel's plan history: every plan for
// the Client, newest first, with status badges. Pure presentational.
import Link from "next/link";
import { Badge } from "@peakform/ui";
import type { PublicNutritionPlan } from "../api-client";

const STATUS_LABELS: Record<PublicNutritionPlan["status"], string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
};

const STATUS_VARIANTS: Record<
  PublicNutritionPlan["status"],
  "warning" | "success" | "outline"
> = {
  DRAFT: "warning",
  ACTIVE: "success",
  ARCHIVED: "outline",
};

export function PlanHistoryList({
  plans,
  builderHref,
}: {
  plans: PublicNutritionPlan[];
  builderHref: string;
}) {
  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum plano criado ainda — gere a estimativa inicial na aba Dieta.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {plans.map((plan) => (
        <li
          key={plan.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
        >
          <div>
            <p className="font-medium text-foreground">
              {plan.calorieTarget} kcal · P {plan.macroTargets.protein}g · C{" "}
              {plan.macroTargets.carbs}g · G {plan.macroTargets.fat}g
            </p>
            <p className="text-xs text-muted-foreground">
              Criado em {new Date(plan.createdAt).toLocaleDateString("pt-BR")}
              {plan.confirmedByProfessionalAt
                ? ` · confirmado em ${new Date(plan.confirmedByProfessionalAt).toLocaleDateString("pt-BR")}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[plan.status]}>{STATUS_LABELS[plan.status]}</Badge>
            <Link
              href={`${builderHref}?planId=${plan.id}`}
              className="text-sm text-accent hover:underline"
            >
              Abrir
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
