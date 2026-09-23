import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";
import { listPendingProfessionals } from "@/features/admin/api-client";
import { ApprovalActions } from "@/features/admin/components/approval-actions";
import { ADMIN_LABELS } from "@/features/admin/labels";
import { SPECIALIZATION_LABELS } from "@/features/relationships/labels";

export const metadata = { title: "Aprovações — PeakForm" };

// PRD 13 §5.2 — surfaces PRD 01 §5.6's approval queue in the console.
export default async function AdminApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const result = await listPendingProfessionals(session.accessToken!);
  const pending = result.ok ? result.data : [];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{ADMIN_LABELS.approvalsTitle}</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_LABELS.approvalsEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((profile) => (
            <li
              key={profile.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{profile.user.fullName}</p>
                <p className="text-sm text-muted-foreground">{profile.user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile.specializations
                    .map((s) => SPECIALIZATION_LABELS[s] ?? s)
                    .join(", ")}
                </p>
                <p className="mt-2 text-sm text-foreground">{profile.verificationNote}</p>
              </div>
              <ApprovalActions userId={profile.userId} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
