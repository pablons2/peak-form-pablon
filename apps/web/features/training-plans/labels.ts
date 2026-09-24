// pt-BR display labels for the training plan vocabularies (PRD 06).
export const MESOCYCLE_GOAL_LABELS: Record<string, string> = {
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Força",
  ENDURANCE: "Resistência",
  POWER: "Potência",
  GENERAL_FITNESS: "Condicionamento geral",
  OTHER: "Outro",
};

export const WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const WEEKDAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const TRAINING_PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado",
};

// Same badge convention as SESSION_STATUS_BADGE_CLASS in
// features/client-training-execution/labels.ts — tinted background + text
// color from the design tokens (apps/web/app/globals.css).
export const TRAINING_PLAN_STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: "bg-warning/15 text-warning",
  ACTIVE: "bg-success/15 text-success",
  COMPLETED: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

// startDate/session dates are pure calendar dates, so every read stays in
// UTC — same pinning as formatDayMonth in features/dashboard/labels.ts.
export function formatPlanStartDate(dateIso: string): string {
  return new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatSessionDate(dateIso: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  if (dateIso.slice(0, 10) === today) return "hoje";
  return new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Concluída",
  MISSED: "Perdida",
  CANCELLED: "Cancelada",
};
