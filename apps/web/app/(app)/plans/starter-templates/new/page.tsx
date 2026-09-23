import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { CreatePlanForm } from "@/features/training-plans/components/create-plan-form";

export const metadata = { title: "Novo Modelo Inicial — PeakForm" };

export default async function NewStarterTemplatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  if (
    session.user.role === "PROFESSIONAL" &&
    session.user.approvalStatus !== "APPROVED"
  ) {
    redirect("/pending-approval");
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Novo modelo inicial</h1>
        <Link href="/plans/starter-templates" className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>
      <CreatePlanForm />
    </main>
  );
}
