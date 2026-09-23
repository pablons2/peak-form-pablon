import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Lock } from "lucide-react";
import type { ClientIntake } from "@/features/relationships/api-client";
import type { PublicLink } from "@/features/relationships/api-client";

export function OnboardingProgressCard({
  link,
  intake,
}: {
  link: PublicLink;
  intake: ClientIntake | null;
}) {
  const intakePending = !intake;
  const intakeCompleted = !!intake;

  const steps = [
    {
      id: "linking",
      label: "Vinculado",
      completed: link.status === "ACTIVE",
      date: link.linkedAt ? new Date(link.linkedAt).toLocaleDateString("pt-BR") : null,
    },
    {
      id: "intake",
      label: "Triagem de Saúde",
      completed: intakeCompleted,
      pending: intakePending,
      icon: intakePending ? "clock" : intakeCompleted ? "check" : "lock",
    },
    {
      id: "plan",
      label: "Plano de Treino",
      blocked: intakePending && link.specialization === "PERSONAL_TRAINER",
      icon: intakePending && link.specialization === "PERSONAL_TRAINER" ? "lock" : "check",
    },
  ];

  const getIcon = (step: (typeof steps)[0]) => {
    if (step.icon === "check") return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (step.icon === "clock") return <Clock className="h-5 w-5 text-warning" />;
    if (step.icon === "lock") return <Lock className="h-5 w-5 text-muted-foreground" />;
    return null;
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-foreground">🎯 Progresso do Onboarding</h3>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            {getIcon(step)}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              {step.date && <p className="text-xs text-muted-foreground">Em {step.date}</p>}
              {step.pending && (
                <p className="text-xs text-warning">Aguardando resposta do cliente</p>
              )}
              {step.blocked && (
                <p className="text-xs text-muted-foreground">Bloqueado até concluir triagem</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {intakePending && link.status === "ACTIVE" && (
        <div className="mt-4 rounded-lg bg-warning/10 border border-warning/30 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-xs text-foreground">
              <p className="font-semibold mb-1">Próxima ação necessária</p>
              <p className="text-muted-foreground mb-2">
                Triagem de saúde é obrigatória antes de criar planos personalizados.
              </p>
              <Link
                href={`/clients/${link.id}/intake`}
                className="inline-block text-accent hover:underline font-medium"
              >
                Ver status da triagem →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
