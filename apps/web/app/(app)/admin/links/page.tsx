import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { listLinks } from "@/features/admin/api-client";
import { ForceUnlinkButton } from "@/features/admin/components/force-unlink-button";
import { ADMIN_LABELS } from "@/features/admin/labels";
import { LINK_STATUS_LABELS, SPECIALIZATION_LABELS } from "@/features/relationships/labels";

export const metadata = { title: "Vínculos — PeakForm" };

const filterInputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

// PRD 13 §5.4 — every ProfessionalClientLink, with force-unlink for dispute
// resolution / cleanup after a Professional deactivation.
export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const result = await listLinks(session.accessToken!, status);
  const links = result.ok ? result.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{ADMIN_LABELS.linksTitle}</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <form method="get" action="/admin/links" className="rounded-lg border border-border bg-card p-4">
        <label htmlFor="status" className="block text-sm text-muted-foreground">
          Status
        </label>
        <div className="mt-1 flex items-center gap-3">
          <select id="status" name="status" defaultValue={status ?? ""} className={filterInputClass}>
            <option value="">Todos</option>
            {Object.entries(LINK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {ADMIN_LABELS.filter}
          </button>
        </div>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_LABELS.linksEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">
                  {link.professional.fullName} → {link.client.fullName}
                </p>
                <p className="text-muted-foreground">
                  {link.professional.email} · {link.client.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {SPECIALIZATION_LABELS[link.specialization] ?? link.specialization} ·{" "}
                  {LINK_STATUS_LABELS[link.status] ?? link.status}
                </p>
              </div>
              {link.status === "ACTIVE" || link.status === "PENDING" ? (
                <ForceUnlinkButton linkId={link.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
