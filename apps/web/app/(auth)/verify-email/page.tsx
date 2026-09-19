import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

export const metadata = { title: "Verificar email — PeakForm" };

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">Verificar email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cole o código que enviamos para o seu email.
      </p>
      <VerifyEmailForm initialToken={searchParams.token ?? ""} />
    </div>
  );
}
