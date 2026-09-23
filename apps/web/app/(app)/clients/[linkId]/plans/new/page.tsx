import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyLinks, getClientIntake } from "@/features/relationships/api-client";
import { CreatePlanForm } from "@/features/training-plans/components/create-plan-form";

export const metadata = { title: "Novo Plano de Treino — PeakForm" };

// PRD 06 §5.1 — create a concrete plan for one linked Client. Blocked
// server-side if the Client's intake isn't COMPLETED/SKIPPED (§5.1) — the
// form surfaces that error inline rather than pre-checking client-side.
export default async function NewClientPlanPage({
  params,
}: {
  params: { linkId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/dashboard");
  if (session.user.approvalStatus !== "APPROVED") redirect("/pending-approval");

  const accessToken = session.accessToken!;
  const linksResult = await listMyLinks(accessToken);
  const link = linksResult.ok
    ? linksResult.data.find((l) => l.id === params.linkId)
    : undefined;
  if (!link) notFound();

  const intakeResult = await getClientIntake(accessToken, link.client.id);
  const intake = intakeResult.ok ? intakeResult.data.intake : null;

  if (!intake) {
    redirect(`/clients/${link.id}/plans?intake_pending=true`);
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Novo plano para {link.client.fullName}
        </h1>
        <Link
          href={`/clients/${link.id}/plans`}
          className="text-sm text-accent hover:underline"
        >
          Voltar
        </Link>
      </div>
      <CreatePlanForm clientId={link.client.id} />
    </main>
  );
}
