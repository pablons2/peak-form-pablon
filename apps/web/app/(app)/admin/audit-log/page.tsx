import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getAuditLog, type AuditLogFilters } from "@/features/admin/api-client";
import { ADMIN_LABELS } from "@/features/admin/labels";

export const metadata = { title: "Log de auditoria — PeakForm" };

const filterInputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

// PRD 13 §5.5 — read-only, filterable view over the append-only AuditLog.
// No edit/delete action exists anywhere on this page or its API client —
// the console has no write path onto this entity at all (§10 AC).
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const pick = (key: string) =>
    typeof searchParams[key] === "string" ? (searchParams[key] as string) : undefined;
  const filters: AuditLogFilters = {
    actorId: pick("actorId"),
    action: pick("action"),
    entity: pick("entity"),
    from: pick("from"),
    to: pick("to"),
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const result = await getAuditLog(session.accessToken!, filters);
  const entries = result.ok ? result.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{ADMIN_LABELS.auditLogTitle}</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <form
        method="get"
        action="/admin/audit-log"
        className="rounded-lg border border-border bg-card p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="actorId" className="block text-sm text-muted-foreground">
              ID do responsável
            </label>
            <input
              id="actorId"
              name="actorId"
              type="text"
              defaultValue={filters.actorId}
              className={filterInputClass}
            />
          </div>
          <div>
            <label htmlFor="action" className="block text-sm text-muted-foreground">
              Ação
            </label>
            <input
              id="action"
              name="action"
              type="text"
              placeholder="Ex.: LINK_FORCE_UNLINKED"
              defaultValue={filters.action}
              className={filterInputClass}
            />
          </div>
          <div>
            <label htmlFor="entity" className="block text-sm text-muted-foreground">
              Entidade
            </label>
            <input
              id="entity"
              name="entity"
              type="text"
              placeholder="Ex.: ProfessionalClientLink"
              defaultValue={filters.entity}
              className={filterInputClass}
            />
          </div>
          <div />
          <div>
            <label htmlFor="from" className="block text-sm text-muted-foreground">
              De
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={filters.from?.slice(0, 10)}
              className={filterInputClass}
            />
          </div>
          <div>
            <label htmlFor="to" className="block text-sm text-muted-foreground">
              Até
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={filters.to?.slice(0, 10)}
              className={filterInputClass}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {ADMIN_LABELS.filter}
          </button>
          {hasFilters ? (
            <Link href="/admin/audit-log" className="text-sm text-accent hover:underline">
              {ADMIN_LABELS.clearFilters}
            </Link>
          ) : null}
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_LABELS.auditLogEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border bg-card p-4 text-sm">
              <p className="font-medium text-foreground">{entry.action}</p>
              <p className="text-muted-foreground">
                {entry.entity} · {entry.entityId}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                por {entry.actor.fullName} ({entry.actor.email}) em{" "}
                {new Date(entry.createdAt).toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
