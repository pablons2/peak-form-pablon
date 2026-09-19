import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { authOptions } from "@/features/auth/nextauth-options";

export const metadata = { title: "Aguardando aprovação — PeakForm" };

// "Waiting for approval" screen (PRD 01 §5.1) — the logged-in home for
// Professionals whose approvalStatus isn't APPROVED. Redirects away once the
// session shows APPROVED (middleware also routes pending professionals here).
export default async function PendingApprovalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/dashboard");
  if (session.user.approvalStatus === "APPROVED") redirect("/dashboard");

  const rejected = session.user.approvalStatus === "REJECTED";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {rejected ? "Cadastro não aprovado" : "Aguardando aprovação"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {rejected ? (
            <>
              Um administrador analisou seu cadastro e ele não foi aprovado.
              Você pode continuar usando o PeakForm como usuário, mas os
              recursos profissionais permanecem bloqueados.
            </>
          ) : (
            <>
              Olá, {session.user.name}! Sua conta está ativa, mas um
              administrador ainda precisa aprovar seu cadastro profissional
              antes que você possa criar planos para alunos.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Esta página atualiza sozinha quando a decisão mudar — saia e entre
          novamente para verificar.
        </p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
