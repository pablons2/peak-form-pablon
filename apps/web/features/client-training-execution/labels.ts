// PT-BR display copy for Client Training Execution (PRD 07) — mirrors
// features/body-assessments/labels.ts's convention of one file per module.

export const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  COMPLETED: "Concluído",
  MISSED: "Perdido",
  CANCELLED: "Cancelado",
};

export const SESSION_STATUS_BADGE_CLASS: Record<string, string> = {
  SCHEDULED: "bg-muted text-muted-foreground",
  COMPLETED: "bg-accent/15 text-accent",
  MISSED: "bg-destructive/15 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};
