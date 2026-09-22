// pt-BR display labels for PRD 02 enums — kept in one place so every screen
// words these the same way (mirrors the backend's domain/labels.ts intent).
export const SPECIALIZATION_LABELS: Record<string, string> = {
  PERSONAL_TRAINER: "Personal trainer",
  NUTRITIONIST: "Nutricionista",
};

export const LINK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  DECLINED: "Recusado",
  EXPIRED: "Expirado",
  UNLINKED: "Encerrado",
};

export const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
};

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  FIRED: "Disparado",
  CANCELLED: "Cancelado",
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

export function anchorLabel(
  cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | null,
  anchor: number | null,
): string {
  if (anchor == null) return "—";
  if (cadence === "MONTHLY") return `dia ${anchor}`;
  return WEEKDAY_LABELS[anchor] ?? String(anchor);
}
