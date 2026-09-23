import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { PublicIntake } from "@/features/intake/api-client";
import { INTAKE_STATUS_LABELS } from "@/features/intake/labels";

export function IntakeStatusCard({ intake }: { intake: PublicIntake | null }) {
  const isCompleted = intake && (intake.status === "COMPLETED" || intake.status === "SKIPPED_WITH_ACKNOWLEDGEMENT");
  const isPending = !intake || intake.status === "IN_PROGRESS";

  if (isCompleted) {
    return (
      <section className="rounded-lg border border-success/30 bg-success/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground">✅ Triagem Concluída</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua triagem de saúde foi aprovada. Você está pronto para começar!
            </p>
            <Link
              href="/intake"
              className="inline-block mt-2 text-accent hover:underline text-sm font-medium"
            >
              Ver detalhes →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-warning/40 bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        {intake?.status === "IN_PROGRESS" ? (
          <Clock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">
            {intake?.status === "IN_PROGRESS"
              ? "⏳ Complete sua triagem agora"
              : "🏥 Triagem de saúde necessária"}
          </h2>
          <p className="mt-1 text-sm text-foreground">
            {intake?.status === "IN_PROGRESS"
              ? "Você começou a triagem. Clique no botão abaixo para continuar respondendo as perguntas."
              : "Esta é uma etapa importante. Responda alguns questionários sobre sua saúde para que seus profissionais possam criar um plano personalizado e seguro."}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Por que é importante?
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              A triagem ajuda seus profissionais a entender melhor sua saúde, histórico de lesões e preferências para criar um programa seguro e eficaz.
            </p>
          </details>
          <Link
            href="/intake"
            className="inline-block mt-3 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground hover:opacity-90 transition-opacity"
          >
            {intake?.status === "IN_PROGRESS" ? "→ Continuar Triagem" : "→ Iniciar Triagem"}
          </Link>
        </div>
      </div>
    </section>
  );
}
