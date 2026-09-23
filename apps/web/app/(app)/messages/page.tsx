import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listMyThreads } from "@/features/messaging/api-client";
import { ThreadList } from "@/features/messaging/components/thread-list";

export const metadata = { title: "Mensagens — PeakForm" };

// PRD 11 §7 — the caller's own inbox (Client or Professional; Admin has no
// personal inbox — its read-only "support" access is API-only, exercised
// one thread at a time, never a dedicated UI surface per §3 Non-Goals).
export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT" && session.user.role !== "PROFESSIONAL") {
    redirect("/dashboard");
  }
  if (session.user.role === "PROFESSIONAL" && session.user.approvalStatus !== "APPROVED") {
    redirect("/pending-approval");
  }

  const accessToken = session.accessToken!;
  const result = await listMyThreads(accessToken);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Mensagens</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <ThreadList
        threads={result.ok ? result.data.threads : []}
        viewerRole={session.user.role as "CLIENT" | "PROFESSIONAL"}
      />
    </main>
  );
}
