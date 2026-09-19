import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/features/auth/nextauth-options";

// Public landing — already-authenticated users go straight to the app.
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-foreground">PeakForm</h1>
        <p className="mt-2 text-muted-foreground">
          Treino, nutrição e progresso — com supervisão profissional.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-fast hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
