import Link from "next/link";
import { Badge, Alert } from "@peakform/ui";
import type { CheckInSchedule, LinkStatus, PublicLink } from "@/features/relationships/api-client";
import type { ClientIntake } from "@/features/relationships/api-client";
import { AlertTriangle } from "lucide-react";
import { OnboardingProgressCard } from "./onboarding-progress-card";

export function OverviewTab({
  link,
  schedules,
  intake,
  viewerId,
}: {
  link: PublicLink;
  schedules: CheckInSchedule[];
  intake: ClientIntake | null;
  viewerId: string;
}) {
  const statusColors: Record<LinkStatus, { bg: string; text: string }> = {
    ACTIVE: { bg: "bg-success/10", text: "text-success" },
    PENDING: { bg: "bg-warning/10", text: "text-warning" },
    DECLINED: { bg: "bg-destructive/10", text: "text-destructive" },
    EXPIRED: { bg: "bg-muted", text: "text-muted-foreground" },
    UNLINKED: { bg: "bg-muted", text: "text-muted-foreground" },
  };

  const statusColor = statusColors[link.status];
  const initials = link.client.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const activeCheckIns = schedules.filter((s) => s.status === "ACTIVE").length;

  const hasContraindications = intake && (
    (intake.painFlags && intake.painFlags.length > 0) ||
    (intake.medicalConditions && intake.medicalConditions.length > 0) ||
    (intake.contraindicationTagCodes && intake.contraindicationTagCodes.length > 0)
  );

  const intakePending = !intake || intake.status === "PENDING";

  return (
    <div className="space-y-6">
      <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">{link.client.fullName}</h2>
            <Badge
              className={`${statusColor.bg} ${statusColor.text}`}
            >
              {link.status === "ACTIVE" ? "Ativo" : "Pendente"}
            </Badge>
            {intakePending && (
              <Badge className="bg-warning/10 text-warning">
                ⚠️ Triagem Pendente
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{link.client.email}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {link.specialization === "PERSONAL_TRAINER" ? "Personal Trainer" : "Nutricionista"}
          </p>
        </div>
      </div>

      <OnboardingProgressCard link={link} intake={intake} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">CHECK-INS ATIVOS</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{activeCheckIns}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">VINCULADO EM</p>
          <p className="mt-2 text-sm text-foreground">
            {link.linkedAt
              ? new Date(link.linkedAt).toLocaleDateString("pt-BR")
              : "Pendente"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">TIPO</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {link.specialization === "PERSONAL_TRAINER" ? "Treino" : "Nutrição"}
          </p>
        </div>
      </div>

      {hasContraindications && (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <div>
            <p className="font-semibold text-warning">Alertas de Contraindicação</p>
            <div className="mt-2 space-y-2 text-sm text-foreground">
              {intake.painFlags && intake.painFlags.length > 0 && (
                <div>
                  <p className="font-medium">Dores/Lesões:</p>
                  <p>{intake.painFlags.map((pf) => pf.tag).join(", ")}</p>
                </div>
              )}
              {intake.medicalConditions && intake.medicalConditions.length > 0 && (
                <div>
                  <p className="font-medium">Condições Médicas:</p>
                  <p>{intake.medicalConditions.join(", ")}</p>
                </div>
              )}
              {intake.contraindicationTagCodes && intake.contraindicationTagCodes.length > 0 && (
                <div>
                  <p className="font-medium">Tags de Contraindicação:</p>
                  <p>{intake.contraindicationTagCodes.join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        </Alert>
      )}

      {link.status === "ACTIVE" && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-foreground">Ações</h3>
          <div className="mt-3 space-y-2">
            <p>
              <Link href={`/clients/${link.id}/intake`} className="text-accent hover:underline text-sm">
                Ver triagem de saúde →
              </Link>
            </p>
            {link.specialization === "PERSONAL_TRAINER" && (
              <>
                <p>
                  <Link href={`/clients/${link.id}/plans`} className="text-accent hover:underline text-sm">
                    Ver planos de treino →
                  </Link>
                </p>
                <p>
                  <Link
                    href={`/clients/${link.id}/training-execution`}
                    className="text-accent hover:underline text-sm"
                  >
                    Ver execução dos treinos →
                  </Link>
                </p>
              </>
            )}
            <p>
              <Link
                href={`/clients/${link.id}/body-assessments`}
                className="text-accent hover:underline text-sm"
              >
                Ver avaliação corporal →
              </Link>
            </p>
            {link.specialization === "NUTRITIONIST" && (
              <p>
                <Link href={`/clients/${link.id}/nutrition`} className="text-accent hover:underline text-sm">
                  Ver nutrição →
                </Link>
              </p>
            )}
            <p>
              <Link href={`/messages/with/${link.client.id}`} className="text-accent hover:underline text-sm">
                Ver mensagens →
              </Link>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
