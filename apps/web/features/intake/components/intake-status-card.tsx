import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { ClientIntake } from "@/features/relationships/api-client";
import { INTAKE_STATUS_LABELS } from "@/features/intake/labels";

export function IntakeStatusCard({ intake }: { intake: ClientIntake | null }) {
  const isCompleted = intake && (intake.status === "APPROVED" || intake.status === "COMPLETED");
  const isPending = !intake || intake.status === "PENDING" || intake.status === "IN_PROGRESS";

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
        <div>
          <h2 className="font-semibold text-foreground">
            {intake?.status === "IN_PROGRESS"
              ? "⏳ Complete sua triagem"
              : "🏥 Inicie sua triagem de saúde"}
          </h2>
          <p className="mt-1 text-sm text-foreground">
            {intake?.status === "IN_PROGRESS"
              ? "Você começou a triagem. Continue de onde parou para desbloquear seu plano personalizado."
              : "Antes de começar seu programa de treino e nutrição, complete uma rápida triagem de saúde."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {intake
              ? `Status: ${INTAKE_STATUS_LABELS[intake.status] ?? intake.status}`
              : "Nunca iniciado"}
          </p>
          <Link
            href="/intake"
            className="inline-block mt-3 rounded-md bg-warning px-3 py-1.5 text-sm font-semibold text-warning-foreground hover:opacity-90"
          >
            {intake?.status === "IN_PROGRESS" ? "Continuar Triagem" : "Iniciar Triagem"}
          </Link>
        </div>
      </div>
    </section>
  );
}
