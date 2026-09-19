import Link from "next/link";
import { GoogleCompleteForm } from "@/features/auth/components/google-complete-form";

export const metadata = { title: "Completar cadastro — PeakForm" };

// Second step of Google OAuth signup (PRD 01 §5.1): Google verified the
// identity but can't supply dateOfBirth/biologicalSex (Client) or
// specializations/verificationNote (Professional), so the user picks a role
// and fills what remains. ?token=&email=&name= arrive from the signIn
// callback's redirect.
export default function CompleteSignupPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string; name?: string };
}) {
  if (!searchParams.token) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Completar cadastro
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este link expirou ou é inválido.{" "}
          <Link href="/login" className="text-accent hover:underline">
            Entre com Google
          </Link>{" "}
          para recomeçar.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground">
        Completar cadastro
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Olá{searchParams.name ? `, ${searchParams.name}` : ""}! Falta pouco —
        só precisamos de mais alguns dados.
      </p>
      <GoogleCompleteForm
        completionToken={searchParams.token}
        email={searchParams.email ?? ""}
      />
    </div>
  );
}
