import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { authOptions } from "@/features/auth/nextauth-options";

export const metadata = { title: "Início — PeakForm" };

// Minimal authenticated landing — the post-login destination. Real dashboard
// content arrives with PRD 09; for now it proves the session works and gives
// pending professionals their redirect target.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // UX-layer routing convenience only — the API's ApprovalStatusGuard is the
  // real boundary once Professional-only endpoints exist (PRD 02/06).
  if (
    session.user.role === "PROFESSIONAL" &&
    session.user.approvalStatus !== "APPROVED"
  ) {
    redirect("/pending-approval");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          Olá, {session.user.name}!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você está conectado como{" "}
          <span className="font-medium text-foreground">
            {session.user.role === "CLIENT"
              ? "aluno(a)"
              : session.user.role === "PROFESSIONAL"
                ? "profissional"
                : "administrador"}
          </span>
          .
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
