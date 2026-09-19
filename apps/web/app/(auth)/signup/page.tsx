import Link from "next/link";

export const metadata = { title: "Cadastro — PeakForm" };

// Role chooser — the two signup paths collect different data (PRD 01 §5.1):
// a Client only needs profile basics, a Professional additionally picks
// specializations and a verification note for the admin queue.
export default function SignupPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">Criar conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Como você vai usar o PeakForm?
      </p>
      <div className="mt-5 space-y-3">
        <Link
          href="/signup/client"
          className="block rounded-md border border-input bg-background px-4 py-3 transition-colors duration-fast hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className="block text-sm font-semibold text-foreground">
            Sou aluno(a)
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Quero acompanhar meu treino, nutrição e progresso.
          </span>
        </Link>
        <Link
          href="/signup/professional"
          className="block rounded-md border border-input bg-background px-4 py-3 transition-colors duration-fast hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className="block text-sm font-semibold text-foreground">
            Sou profissional
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Personal trainer ou nutricionista — acompanharei meus alunos.
          </span>
        </Link>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
