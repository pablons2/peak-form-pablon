import Link from "next/link";
import { ClipboardCheck, Dumbbell, Link2, ScrollText, Users, type LucideIcon } from "lucide-react";
import { Card } from "@peakform/ui";
import type { AdminAnalytics } from "../../admin/api-client";
import { SPECIALIZATION_LABELS } from "../../relationships/labels";

function percentOrDash(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

// docs/redesign-plan.md §5.3 "Admin variant" — replaces the bare text-link
// "NavigationLanding" with the same attention-feed + snapshot card language
// as the Professional dashboard. All figures reuse existing endpoints
// (listPendingProfessionals, adminListExercises, getAnalytics) — no new
// backend work (§7 non-goal).
export function AdminDashboard({
  pendingApprovals,
  pendingExercises,
  analytics,
}: {
  pendingApprovals: number;
  pendingExercises: number;
  analytics: AdminAnalytics | null;
}) {
  const hasAttention = pendingApprovals > 0 || pendingExercises > 0;

  return (
    <div className="space-y-5">
      {hasAttention ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Precisa de atenção</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingApprovals > 0 ? (
              <Link href="/admin/approvals">
                <Card className="flex items-center gap-3 p-4 transition-colors duration-fast ease-standard hover:border-warning/50">
                  <ClipboardCheck className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {pendingApprovals} {pendingApprovals > 1 ? "aprovações pendentes" : "aprovação pendente"}
                    </p>
                    <p className="text-xs text-muted-foreground">Profissionais aguardando revisão</p>
                  </div>
                </Card>
              </Link>
            ) : null}
            {pendingExercises > 0 ? (
              <Link href="/admin/exercises">
                <Card className="flex items-center gap-3 p-4 transition-colors duration-fast ease-standard hover:border-warning/50">
                  <Dumbbell className="h-5 w-5 shrink-0 text-warning" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {pendingExercises} {pendingExercises > 1 ? "exercícios para revisar" : "exercício para revisar"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Exercícios personalizados aguardando promoção
                    </p>
                  </div>
                </Card>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {analytics ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Plataforma</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-2xl font-semibold text-foreground">{analytics.activeClients}</p>
              <p className="mt-1 text-xs text-muted-foreground">Clientes ativos</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-semibold text-foreground">
                {analytics.activeProfessionals.total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Profissionais ativos</p>
              {Object.keys(analytics.activeProfessionals.bySpecialization).length > 0 ? (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {Object.entries(analytics.activeProfessionals.bySpecialization)
                    .map(([spec, count]) => `${SPECIALIZATION_LABELS[spec] ?? spec}: ${count}`)
                    .join(" · ")}
                </p>
              ) : null}
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-semibold text-foreground">
                {percentOrDash(analytics.averageWeeklyTrainingAdherencePercent)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Adesão média ao treino</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-semibold text-foreground">
                {percentOrDash(analytics.averageWeeklyNutritionAdherencePercent)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Adesão média à nutrição</p>
            </Card>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Administração</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink href="/admin/users" icon={Users} label="Usuários" />
          <QuickLink href="/admin/links" icon={Link2} label="Vínculos" />
          <QuickLink href="/admin/audit-log" icon={ScrollText} label="Log de auditoria" />
          <QuickLink href="/admin/analytics" icon={ClipboardCheck} label="Análises" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-3 p-4 transition-colors duration-fast ease-standard hover:border-accent/50">
        <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </Card>
    </Link>
  );
}
