import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import {
  listCheckInSchedules,
  listMyLinks,
  type PublicLink,
} from "@/features/relationships/api-client";
import { LinkCard } from "@/features/relationships/components/link-card";
import { CheckInsPanel } from "@/features/relationships/components/check-ins-panel";
import { RequestProfessionalForm } from "@/features/relationships/components/request-professional-form";
import { LINK_STATUS_LABELS, SPECIALIZATION_LABELS } from "@/features/relationships/labels";

export const metadata = { title: "Meu Time — PeakForm" };

// PRD 02 §7 — Client-facing "My Team" screen: current Trainer/Nutritionist
// (with unlink as the "Change" entry point — unlink, then request a new one,
// rather than a silent overwrite), pending invites/requests awaiting a
// response, and read-only upcoming check-ins per active link.
export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const result = await listMyLinks(accessToken);
  const links: PublicLink[] = result.ok ? result.data : [];

  const active = links.filter((l) => l.status === "ACTIVE");
  const pending = links.filter((l) => l.status === "PENDING");
  const history = links.filter(
    (l) => l.status === "DECLINED" || l.status === "EXPIRED" || l.status === "UNLINKED",
  );

  const checkInsByLink = new Map<string, Awaited<ReturnType<typeof listCheckInSchedules>>>();
  await Promise.all(
    active.map(async (link) => {
      checkInsByLink.set(link.id, await listCheckInSchedules(accessToken, link.id));
    }),
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Meu Time</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">
          Solicitar um profissional
        </h2>
        <div className="mt-3">
          <RequestProfessionalForm />
        </div>
      </section>

      {pending.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-foreground">
            Convites pendentes
          </h2>
          <ul className="mt-2 space-y-2">
            {pending.map((link) => (
              <LinkCard key={link.id} link={link} viewerId={session.user.id!} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-medium text-foreground">Time atual</h2>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não tem um trainer ou nutricionista vinculado.
          </p>
        ) : (
          <div className="mt-2 space-y-4">
            {active.map((link) => {
              const schedules = checkInsByLink.get(link.id);
              return (
                <div key={link.id} className="rounded-lg border border-border bg-card p-4">
                  <LinkCard link={link} viewerId={session.user.id!} />
                  <p className="mt-3 text-sm">
                    <Link
                      href={`/messages/with/${link.professional.id}`}
                      className="text-accent hover:underline"
                    >
                      Ver mensagens →
                    </Link>
                  </p>
                  <div className="mt-4 border-t border-border pt-4">
                    <h3 className="text-sm font-medium text-foreground">
                      Próximos check-ins
                    </h3>
                    <div className="mt-2">
                      <CheckInsPanel
                        linkId={link.id}
                        schedules={schedules?.ok ? schedules.data : []}
                        canManage={false}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {history.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-foreground">Histórico</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {history.map((link) => (
              <li key={link.id}>
                {link.professional.fullName} —{" "}
                {SPECIALIZATION_LABELS[link.specialization] ?? link.specialization}{" "}
                ({LINK_STATUS_LABELS[link.status] ?? link.status})
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
