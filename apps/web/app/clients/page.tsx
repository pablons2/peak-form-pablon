import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchMe } from "@/features/auth/api-client";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks, type PublicLink } from "@/features/relationships/api-client";
import { LinkCard } from "@/features/relationships/components/link-card";
import { InviteClientForm } from "@/features/relationships/components/invite-client-form";

export const metadata = { title: "Meus Clientes — PeakForm" };

// PRD 02 §7 — Professional's client list, clearly distinguishing PENDING
// invites from ACTIVE clients, plus the invite-by-email entry point (§5.1).
export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/dashboard");
  if (session.user.approvalStatus !== "APPROVED") redirect("/pending-approval");

  const accessToken = session.accessToken!;
  const [me, result] = await Promise.all([
    fetchMe(accessToken),
    listMyLinks(accessToken),
  ]);
  const links: PublicLink[] = result.ok ? result.data : [];

  const active = links.filter((l) => l.status === "ACTIVE");
  const pending = links.filter((l) => l.status === "PENDING");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Meus Clientes</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Convidar cliente</h2>
        <div className="mt-3">
          <InviteClientForm
            ownSpecializations={me?.professional?.specializations ?? []}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">Pendentes</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum convite ou solicitação pendente.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {pending.map((link) => (
              <LinkCard key={link.id} link={link} viewerId={session.user.id!} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-foreground">Ativos</h2>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum cliente ativo ainda.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {active.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                viewerId={session.user.id!}
                detailHref={`/clients/${link.id}`}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
