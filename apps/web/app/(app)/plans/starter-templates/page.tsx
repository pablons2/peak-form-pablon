import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { listStarterTemplates } from "@/features/training-plans/api-client";
import { AssignStarterTemplateButton } from "@/features/training-plans/components/assign-starter-template-button";

export const metadata = { title: "Modelos Iniciais — PeakForm" };

// PRD 06 §5.8 — browsable by any authenticated role. Clients without an
// active Personal Trainer can self-assign one; the backend re-checks that
// (the button surfaces the error inline if it no longer holds).
export default async function StarterTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const accessToken = session.accessToken!;
  const result = await listStarterTemplates(accessToken);
  const templates = result.ok ? result.data : [];
  const canAuthor = session.user.role === "PROFESSIONAL" || session.user.role === "ADMIN";

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Modelos iniciais</h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>

      {canAuthor ? (
        <Link
          href="/plans/starter-templates/new"
          className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Criar novo modelo
        </Link>
      ) : null}

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum modelo disponível ainda.</p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-lg border border-border bg-card p-4">
              <Link href={`/plans/${t.id}`} className="font-medium text-foreground hover:underline">
                {t.name}
              </Link>
              {session.user.role === "CLIENT" ? (
                <div className="mt-2">
                  <AssignStarterTemplateButton templateId={t.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
