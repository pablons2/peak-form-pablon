import Link from "next/link";
import { CalendarX, MessageSquare, UserPlus, Users } from "lucide-react";
import { Card, EmptyState } from "@peakform/ui";
import type { PublicLink } from "../../relationships/api-client";
import type { PublicThreadSummary } from "../../messaging/api-client";

export interface UnscheduledClient {
  linkId: string;
  clientName: string;
}

// docs/redesign-plan.md §5.3 — the Professional's home, replacing the bare
// text-link "NavigationLanding" this role fell through to. Every number here
// comes from an endpoint that already existed (§7 non-goal: no new backend
// work).
//
// "unscheduledClients" (not "overdue check-ins", which was this component's
// first cut): PRD 02 §5.6's due-job moves a fired ONE_OFF schedule straight
// to FIRED and self-renews a RECURRING one's nextDueAt, so an ACTIVE
// schedule with a past nextDueAt only exists in the brief window before that
// job's next tick — verified live against the seeded demo data, where it
// read as permanently empty. The real, non-transient "needs attention"
// signal this domain actually supports is a client with zero ACTIVE
// schedules at all — no check-in currently in place, whether one never was
// or the last one fired and nothing replaced it.
export function ProfessionalDashboard({
  active,
  pending,
  incomingRequests,
  unscheduledClients,
  threadsWithUnread,
}: {
  active: PublicLink[];
  pending: PublicLink[];
  incomingRequests: PublicLink[];
  unscheduledClients: UnscheduledClient[];
  threadsWithUnread: PublicThreadSummary[];
}) {
  if (active.length === 0 && pending.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum cliente ainda"
        description="Convide seu primeiro cliente para começar a acompanhar treinos, nutrição e check-ins."
        action={
          <Link href="/clients" className="text-sm font-medium text-accent hover:underline">
            Convidar cliente →
          </Link>
        }
      />
    );
  }

  const unreadTotal = threadsWithUnread.reduce((sum, t) => sum + t.unreadCount, 0);
  const hasAttention =
    incomingRequests.length > 0 || unscheduledClients.length > 0 || threadsWithUnread.length > 0;

  return (
    <div className="space-y-5">
      {hasAttention ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Precisa de atenção hoje</h2>
          <Card className="divide-y divide-border overflow-hidden">
            {incomingRequests.map((link) => (
              <Link
                key={`request-${link.id}`}
                href="/clients"
                className="flex items-center gap-3 p-3 transition-colors duration-fast ease-standard hover:bg-muted"
              >
                <UserPlus className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Solicitação de vínculo</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.client.fullName} quer se conectar
                  </p>
                </div>
              </Link>
            ))}
            {threadsWithUnread.map((thread) => (
              <Link
                key={`thread-${thread.id}`}
                href="/messages"
                className="flex items-center gap-3 p-3 transition-colors duration-fast ease-standard hover:bg-muted"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Nova mensagem</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {thread.client.fullName} · {thread.unreadCount}{" "}
                    {thread.unreadCount > 1 ? "não lidas" : "não lida"}
                  </p>
                </div>
              </Link>
            ))}
            {unscheduledClients.map((item) => (
              <Link
                key={`unscheduled-${item.linkId}`}
                href={`/clients/${item.linkId}`}
                className="flex items-center gap-3 p-3 transition-colors duration-fast ease-standard hover:bg-muted"
              >
                <CalendarX className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Sem check-in agendado</p>
                  <p className="truncate text-xs text-muted-foreground">{item.clientName}</p>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Sua carteira</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Clientes ativos" value={active.length} href="/clients" />
          <StatCard label="Convites pendentes" value={pending.length} href="/clients" />
          <StatCard
            label="Sem check-in agendado"
            value={unscheduledClients.length}
            tone={unscheduledClients.length > 0 ? "warning" : undefined}
          />
          <StatCard
            label="Mensagens não lidas"
            value={unreadTotal}
            href="/messages"
            tone={unreadTotal > 0 ? "primary" : undefined}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "warning" | "primary";
}) {
  const valueClass =
    tone === "warning" ? "text-warning" : tone === "primary" ? "text-primary" : "text-foreground";
  const content = (
    <Card className="p-4 transition-colors duration-fast ease-standard hover:border-accent/50">
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
