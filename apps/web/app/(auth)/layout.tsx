import Link from "next/link";

// Shared shell for the public auth screens (login, signup, verify, reset):
// centered card on mobile-first width, brand header, back-to-home link.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <Link href="/" className="text-2xl font-semibold text-foreground">
            PeakForm
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Treino, nutrição e progresso — com supervisão profissional.
          </p>
        </header>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
