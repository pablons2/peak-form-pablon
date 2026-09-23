import Link from "next/link";
import { Badge, Alert } from "@peakform/ui";
import type { CheckInSchedule, LinkStatus, PublicLink } from "@/features/relationships/api-client";
import type { ClientIntake } from "@/features/relationships/api-client";
import { AlertTriangle } from "lucide-react";

export function ClientProfileCard({
  link,
  schedules,
  intake,
}: {
  link: PublicLink;
  schedules: CheckInSchedule[];
  intake: ClientIntake | null;
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

  const intakePending = !intake;

  return (
    <div className="space-y-4">
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
                  <p className="font-medium">Categorias Contraindicadas:</p>
                  <p>{intake.contraindicationTagCodes.join(", ")}</p>
                </div>
              )}
            </div>
            <Link
              href="#intake"
              className="inline-block mt-3 text-accent hover:underline text-sm font-medium"
            >
              Ver triagem completa →
            </Link>
          </div>
        </Alert>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-foreground">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{link.client.fullName}</h2>
              <Badge
                className={`flex-shrink-0 ${statusColor.bg} ${statusColor.text}`}
              >
                {link.status === "ACTIVE" ? "Ativo" : "Pendente"}
              </Badge>
              {intakePending && (
                <Badge className="flex-shrink-0 bg-warning/10 text-warning">
                  ⚠️ Triagem Pendente
                </Badge>
              )}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">{link.client.email}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {link.specialization === "PERSONAL_TRAINER" ? "Personal Trainer" : "Nutricionista"}
            </p>

            {link.linkedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Vinculado em {new Date(link.linkedAt).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">CHECK-INS ATIVOS</p>
          <p className="mt-3 text-3xl font-bold text-foreground">{activeCheckIns}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">VINCULADO EM</p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {link.linkedAt
              ? new Date(link.linkedAt).toLocaleDateString("pt-BR")
              : "Pendente"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">TIPO</p>
          <p className="mt-3 text-sm font-medium text-foreground">
            {link.specialization === "PERSONAL_TRAINER" ? "Treino" : "Nutrição"}
          </p>
        </div>
      </div>
    </div>
  );
}
