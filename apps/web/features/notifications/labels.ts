// Flat label map, matching every other feature's labels.ts convention.
// Keys are the backend's NotificationType enum members; the `satisfies
// Record<string, string>` keeps each literal key's type, and every dynamic
// lookup pairs with `?? fallback` per the codebase's
// noUncheckedIndexedAccess convention.
export const NOTIFICATION_TYPE_LABELS = {
  SESSION_REMINDER: "Lembrete de treino",
  MISSED_SESSION: "Treino perdido",
  MISSED_FOOD_LOG: "Registro alimentar",
  NEW_MESSAGE: "Nova mensagem",
  PLAN_UPDATED: "Plano atualizado",
  TRAINING_PLAN_CREATED: "Novo plano de treino",
  WEEKLY_SUMMARY_READY: "Resumo semanal",
  CHECK_IN_DUE: "Check-in",
  APPROVAL_DECISION: "Decisão de aprovação",
  EMAIL_VERIFICATION: "Verificação de e-mail",
  PASSWORD_RESET: "Redefinição de senha",
} satisfies Record<string, string>;

export const NOTIFICATION_LABELS = {
  pageTitle: "Notificações",
  preferencesTitle: "Preferências de notificação",
  emailColumn: "E-mail",
  pushColumn: "Push",
  lockedHint: "obrigatório",
  savePreferences: "Salvar preferências",
  preferencesSaved: "Preferências salvas.",
  preferencesLockedError:
    "As notificações de decisão de aprovação não podem ter o e-mail desativado.",
  empty: "Nenhuma notificação ainda.",
  markRead: "Marcar como lida",
  markAllRead: "Marcar todas como lidas",
  unread: "não lida",
  loadError: "Não foi possível carregar suas notificações.",
  pushTitle: "Notificações push",
  pushEnable: "Ativar notificações push",
  pushDisable: "Desativar notificações push",
  pushEnabled: "Notificações push ativas neste navegador.",
  pushDenied:
    "O navegador bloqueou as notificações — você continuará recebendo por e-mail.",
  pushUnsupported:
    "Este navegador não suporta notificações push — você continuará recebendo por e-mail.",
  pushNotConfigured: "Notificações push não estão configuradas neste ambiente.",
} satisfies Record<string, string>;
