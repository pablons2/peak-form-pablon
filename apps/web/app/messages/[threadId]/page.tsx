import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { getThread } from "@/features/messaging/api-client";
import { ThreadView } from "@/features/messaging/components/thread-view";

export const metadata = { title: "Conversa — PeakForm" };

// PRD 11 §5.2/§7 — one thread's full history + composer (or a read-only
// notice once the underlying relationship has ended, §5.3). Fetching marks
// the other party's messages read as a side effect of the API call itself.
export default async function ThreadPage({ params }: { params: { threadId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT" && session.user.role !== "PROFESSIONAL") {
    redirect("/dashboard");
  }
  if (session.user.role === "PROFESSIONAL" && session.user.approvalStatus !== "APPROVED") {
    redirect("/pending-approval");
  }

  const accessToken = session.accessToken!;
  const result = await getThread(accessToken, params.threadId);
  if (!result.ok) notFound();

  const { thread, messages } = result.data;
  const other = session.user.role === "PROFESSIONAL" ? thread.client : thread.professional;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{other.fullName}</h1>
        <Link href="/messages" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      <ThreadView thread={thread} messages={messages} viewerId={session.user.id!} />
    </main>
  );
}
