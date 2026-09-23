import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { listUsers, type UserListFilters } from "@/features/admin/api-client";
import { UserStatusButton } from "@/features/admin/components/user-status-button";
import {
  APPROVAL_STATUS_LABELS,
  ROLE_LABELS,
  USER_STATUS_LABELS,
  ADMIN_LABELS,
} from "@/features/admin/labels";
import { SPECIALIZATION_LABELS } from "@/features/relationships/labels";

export const metadata = { title: "Usuários — PeakForm" };

const filterInputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

// PRD 13 §5.1 — Admin's list/search over every User, with deactivate/
// reactivate wired directly into the same view (§10 AC: "view, deactivate,
// and reactivate any user account").
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const pick = (key: string) =>
    typeof searchParams[key] === "string" ? (searchParams[key] as string) : undefined;
  const filters: UserListFilters = {
    role: pick("role") as UserListFilters["role"],
    status: pick("status") as UserListFilters["status"],
    q: pick("q"),
  };
  const hasFilters = Boolean(filters.role || filters.status || filters.q);

  const result = await listUsers(session.accessToken!, filters);
  const users = result.ok ? result.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{ADMIN_LABELS.usersTitle}</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <form method="get" action="/admin/users" className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label htmlFor="q" className="block text-sm text-muted-foreground">
              Busca
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder={ADMIN_LABELS.searchPlaceholder}
              className={filterInputClass}
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm text-muted-foreground">
              Papel
            </label>
            <select
              id="role"
              name="role"
              defaultValue={filters.role ?? ""}
              className={filterInputClass}
            >
              <option value="">Todos</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm text-muted-foreground">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
              className={filterInputClass}
            >
              <option value="">Todos</option>
              {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
            <Link href="/admin/users" className="text-sm text-accent hover:underline">
              {ADMIN_LABELS.clearFilters}
            </Link>
          ) : null}
        </div>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_LABELS.usersEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ROLE_LABELS[user.role] ?? user.role} ·{" "}
                  {USER_STATUS_LABELS[user.status] ?? user.status}
                  {user.professionalProfile ? (
                    <>
                      {" · "}
                      {user.professionalProfile.specializations
                        .map((s) => SPECIALIZATION_LABELS[s] ?? s)
                        .join(", ")}
                      {" · "}
                      {APPROVAL_STATUS_LABELS[user.professionalProfile.approvalStatus] ??
                        user.professionalProfile.approvalStatus}
                    </>
                  ) : null}
                </p>
              </div>
              {user.role !== "ADMIN" ? (
                <UserStatusButton userId={user.id} status={user.status} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
