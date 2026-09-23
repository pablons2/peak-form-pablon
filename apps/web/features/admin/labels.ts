// Flat label map, matching every other feature's labels.ts convention.
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  PROFESSIONAL: "Profissional",
  CLIENT: "Cliente",
};

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  DEACTIVATED: "Desativado",
};

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export const ADMIN_LABELS = {
  usersTitle: "Usuários",
  usersEmpty: "Nenhum usuário encontrado.",
  searchPlaceholder: "Buscar por nome ou e-mail",
  deactivate: "Desativar",
  reactivate: "Reativar",
  approvalsTitle: "Aprovações de profissionais",
  approvalsEmpty: "Nenhuma solicitação pendente.",
  emailVerified: "Email verificado",
  emailPending: "Email pendente",
  approve: "Aprovar",
  reject: "Rejeitar",
  rejectReasonPlaceholder: "Motivo (opcional)",
  approveDisabledUntilVerified: "O profissional precisa verificar o email antes de ser aprovado.",
  linksTitle: "Vínculos profissional–cliente",
  linksEmpty: "Nenhum vínculo encontrado.",
  forceUnlink: "Forçar desvínculo",
  auditLogTitle: "Log de auditoria",
  auditLogEmpty: "Nenhum registro encontrado para os filtros aplicados.",
  filter: "Filtrar",
  clearFilters: "Limpar filtros",
  analyticsTitle: "Análises agregadas",
  activeClients: "Clientes ativos",
  activeProfessionals: "Profissionais ativos",
  avgTrainingAdherence: "Adesão média ao treino (7 dias)",
  avgNutritionAdherence: "Adesão média à nutrição (7 dias)",
  noData: "sem dados suficientes",
  loadError: "Não foi possível carregar os dados agora.",
} satisfies Record<string, string>;
