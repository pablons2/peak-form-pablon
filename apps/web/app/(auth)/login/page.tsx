import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata = { title: "Entrar — PeakForm" };

// Server component: decides whether the Google button renders (the provider
// only exists when GOOGLE_CLIENT_ID/SECRET are configured) and passes any
// NextAuth ?error= through to the form.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">Entrar</h1>
      <LoginForm googleEnabled={googleEnabled} initialError={searchParams.error} />
      <div className="mt-4 space-y-1 text-center text-sm">
        <p>
          <Link href="/password-reset" className="text-accent hover:underline">
            Esqueci minha senha
          </Link>
        </p>
        <p className="text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
