import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { getThreadWith } from "@/features/messaging/api-client";

// Deep-link resolver used by /clients/[linkId] (a Professional linking into
// a specific Client's thread) and /team (a Client linking into a specific
// Professional's thread) — both know the *other party's* User id from their
// own link data, not a threadId. Resolves via GET
// /messaging/threads/with/:otherUserId and redirects to the real thread
// page; 404s if no thread exists yet (a link that never went ACTIVE has no
// thread to show — a normal, unexceptional state, not an error condition
// for the caller, but nothing to redirect to either).
export default async function ThreadWithPage({
  params,
}: {
  params: { otherUserId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT" && session.user.role !== "PROFESSIONAL") {
    redirect("/dashboard");
  }

  const accessToken = session.accessToken!;
  const result = await getThreadWith(accessToken, params.otherUserId);
  if (!result.ok || !result.data.thread) notFound();

  redirect(`/messages/${result.data.thread.id}`);
}
