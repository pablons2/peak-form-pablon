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

// CheckInSchedule.dueDate/nextDueAt are pure calendar dates — always
// constructed as UTC midnight (see compute-next-due-date.ts's Date.UTC
// calls), with no real time-of-day to speak of. Formatting them against
// America/Sao_Paulo (UTC-3) would shift every value back to the previous
// day (a UTC-midnight instant is always 21:00 the prior day there) — the
// same class of bug features/client-training-execution's
// session-history-list.tsx already avoids for Session.date by pinning to
// UTC instead. Fixed here (PRD 09) after it surfaced live via the
// dashboard's checkInDue card, which reuses this same formatter.
export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
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
