import Link from "next/link";
import { ProfessionalSignupForm } from "@/features/auth/components/professional-signup-form";

export const metadata = { title: "Cadastro profissional — PeakForm" };

export default function ProfessionalSignupPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">
        Cadastro profissional
      </h1>
      {/* PRD 01 §7 — expectation-setting copy up front, so the approval gate
          isn't a surprise after signup. */}
      <p className="mt-1 text-sm text-muted-foreground">
        Sua conta será analisada por um administrador antes que você possa
        criar planos para alunos.
      </p>
      <ProfessionalSignupForm />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
