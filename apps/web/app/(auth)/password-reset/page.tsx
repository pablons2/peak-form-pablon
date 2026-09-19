import Link from "next/link";
import { PasswordResetRequestForm } from "@/features/auth/components/password-reset-request-form";

export const metadata = { title: "Redefinir senha — PeakForm" };

export default function PasswordResetPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">Redefinir senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Informe seu email e enviaremos um código para redefinir a senha.
      </p>
      <PasswordResetRequestForm />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
