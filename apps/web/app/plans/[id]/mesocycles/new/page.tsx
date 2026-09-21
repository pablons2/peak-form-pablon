import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/features/auth/nextauth-options";
import { getTrainingPlan } from "@/features/training-plans/api-client";
import { CreateMesocycleForm } from "@/features/training-plans/components/create-mesocycle-form";

export const metadata = { title: "Novo Mesociclo — PeakForm" };

export default async function NewMesocyclePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const accessToken = session.accessToken!;
  const result = await getTrainingPlan(accessToken, params.id);
  if (!result.ok) notFound();

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Novo mesociclo — {result.data.name}
        </h1>
        <Link href={`/plans/${params.id}`} className="text-sm text-accent hover:underline">
          Voltar
        </Link>
      </div>
      <CreateMesocycleForm planId={params.id} />
    </main>
  );
}
