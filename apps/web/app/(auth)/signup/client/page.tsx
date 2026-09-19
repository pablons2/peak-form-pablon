import Link from "next/link";
import { ClientSignupForm } from "@/features/auth/components/client-signup-form";

export const metadata = { title: "Cadastro de aluno — PeakForm" };

export default function ClientSignupPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">
        Cadastro de aluno
      </h1>
      <ClientSignupForm />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
