import { PasswordResetConfirmForm } from "@/features/auth/components/password-reset-confirm-form";

export const metadata = { title: "Nova senha — PeakForm" };

export default function PasswordResetConfirmPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">Nova senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cole o código recebido por email e escolha a nova senha.
      </p>
      <PasswordResetConfirmForm initialToken={searchParams.token ?? ""} />
    </div>
  );
}
