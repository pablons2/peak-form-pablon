// Central registry of all API error messages with their Portuguese translations.
// Maps exceptions thrown across all modules to stable error codes + PT-BR messages.

export interface ErrorMessageEntry {
  match: string | RegExp;
  code: string;
  message: string;
}

export interface TranslatedError {
  code: string;
  message: string;
}

const ERROR_REGISTRY: ErrorMessageEntry[] = [
  // ============================================================================
  // AUTH MODULE
  // ============================================================================
  {
    match: "An account with this email already exists",
    code: "EMAIL_ALREADY_EXISTS",
    message: "Uma conta com este email já existe",
  },
  {
    match: "Invalid email or password",
    code: "INVALID_CREDENTIALS",
    message: "Email ou senha inválidos",
  },
  {
    match: "This account has been deactivated. Contact an administrator.",
    code: "ACCOUNT_DEACTIVATED",
    message: "Sua conta foi desativada. Entre em contato com um administrador",
  },
  {
    match: "Please verify your email before logging in",
    code: "EMAIL_NOT_VERIFIED",
    message: "Verifique seu email antes de fazer login",
  },
  {
    match: "Google account email is not verified",
    code: "GOOGLE_EMAIL_NOT_VERIFIED",
    message: "O email da sua conta Google não está verificado",
  },
  {
    match: "Invalid or expired session",
    code: "INVALID_SESSION",
    message: "Sessão inválida ou expirada",
  },
  {
    match: "Professional account not found",
    code: "PROFESSIONAL_NOT_FOUND",
    message: "Conta profissional não encontrada",
  },
  {
    match: "Invalid or expired reset token",
    code: "INVALID_RESET_TOKEN",
    message: "Link de redefinição inválido ou expirado",
  },
  {
    match: "Invalid or expired verification token",
    code: "INVALID_VERIFY_TOKEN",
    message: "Link de verificação inválido ou expirado",
  },
  {
    match: "User not found",
    code: "USER_NOT_FOUND",
    message: "Usuário não encontrado",
  },
  {
    match: "Invalid or expired token",
    code: "INVALID_TOKEN",
    message: "Token inválido ou expirado",
  },
  {
    match: "Invalid Google ID token",
    code: "INVALID_GOOGLE_TOKEN",
    message: "Token do Google inválido",
  },
  {
    match: "Google ID token has no email",
    code: "GOOGLE_TOKEN_NO_EMAIL",
    message: "Token do Google não contém email",
  },
  {
    match: "Missing refresh token",
    code: "MISSING_REFRESH_TOKEN",
    message: "Token de atualização ausente",
  },
  {
    match: "Insufficient role",
    code: "INSUFFICIENT_ROLE",
    message: "Acesso insuficiente para esta ação",
  },
  {
    match: "This feature requires the Personal Trainer specialization",
    code: "REQUIRES_PERSONAL_TRAINER",
    message: "Este recurso requer a especialização de Personal Trainer",
  },
  {
    match: "This feature requires the Nutritionist specialization",
    code: "REQUIRES_NUTRITIONIST",
    message: "Este recurso requer a especialização de Nutricionista",
  },
  {
    match: "Your professional account is awaiting admin approval",
    code: "PENDING_APPROVAL",
    message: "Sua conta profissional está aguardando aprovação de um administrador",
  },
  {
    match: "Missing access token",
    code: "MISSING_ACCESS_TOKEN",
    message: "Token de acesso ausente",
  },

  // ============================================================================
  // RELATIONSHIPS MODULE
  // ============================================================================
  {
    match: "No professional account exists with that email",
    code: "PROFESSIONAL_EMAIL_NOT_FOUND",
    message: "Nenhum profissional encontrado com este email",
  },
  {
    match: "No APPROVED professional account exists with that email",
    code: "PROFESSIONAL_NOT_APPROVED",
    message: "Nenhum profissional aprovado encontrado com este email",
  },
  {
    match: /is not a (Personal Trainer|Nutritionist)/,
    code: "PROFESSIONAL_SPECIALIZATION_MISMATCH",
    message: "Este profissional não tem a especialização necessária",
  },
  {
    match: "You already have an active trainer — unlink first",
    code: "ACTIVE_TRAINER_EXISTS",
    message: "Você já tem um Personal Trainer ativo. Desvincule primeiro",
  },
  {
    match: "You already have an active nutritionist — unlink first",
    code: "ACTIVE_NUTRITIONIST_EXISTS",
    message: "Você já tem um Nutricionista ativo. Desvincule primeiro",
  },
  {
    match: /A (PENDING|ACTIVE|CANCELLED) (Personal Trainer|Nutritionist) link with this professional already exists/,
    code: "LINK_ALREADY_EXISTS",
    message: "Você já tem um link com este profissional",
  },
  {
    match: "Link not found",
    code: "LINK_NOT_FOUND",
    message: "Link não encontrado",
  },
  {
    match: "Only the recipient of the invite can respond to it",
    code: "NOT_LINK_RECIPIENT",
    message: "Apenas o destinatário do convite pode responder",
  },
  {
    match: /Only a pending link can be declined/,
    code: "CANNOT_DECLINE_LINK",
    message: "Apenas um convite pendente pode ser recusado",
  },
  {
    match: "Check-ins require an ACTIVE professional-client link",
    code: "LINK_NOT_ACTIVE",
    message: "É necessário um vínculo ativo para criar check-ins",
  },
  {
    match: "dueDate must be in the future",
    code: "INVALID_DUE_DATE",
    message: "A data deve ser no futuro",
  },
  {
    match: "MONTHLY anchor must be a day-of-month between 1 and 31",
    code: "INVALID_MONTHLY_ANCHOR",
    message: "Para agendamentos mensais, selecione um dia entre 1 e 31",
  },
  {
    match: "WEEKLY/BIWEEKLY anchor must be a weekday 0-6",
    code: "INVALID_WEEKLY_ANCHOR",
    message: "Para agendamentos semanais, selecione um dia da semana",
  },
  {
    match: "Only one of the two parties can unlink this relationship",
    code: "NOT_LINK_PARTY",
    message: "Apenas um dos participantes pode desfazer este vínculo",
  },
  {
    match: /Only an active relationship can be unlinked/,
    code: "CANNOT_UNLINK_INACTIVE",
    message: "Apenas um vínculo ativo pode ser desfeito",
  },
  {
    match: "Check-in schedule not found",
    code: "CHECK_IN_SCHEDULE_NOT_FOUND",
    message: "Agendamento de check-in não encontrado",
  },
  {
    match: "You can only edit check-in schedules you created",
    code: "CANNOT_EDIT_CHECK_IN",
    message: "Você só pode editar agendamentos que criou",
  },
  {
    match: "Only an ACTIVE schedule can be edited",
    code: "CANNOT_EDIT_INACTIVE_SCHEDULE",
    message: "Apenas um agendamento ativo pode ser editado",
  },
  {
    match: "You can only invite clients for your own specializations",
    code: "SPECIALIZATION_MISMATCH_INVITE",
    message: "Você só pode convidar para suas próprias especializações",
  },
  {
    match: "That email belongs to an existing non-client account",
    code: "EMAIL_NOT_CLIENT",
    message: "Este email pertence a uma conta que não é de cliente",
  },
  {
    match: /A .* (Personal Trainer|Nutritionist) link with this client already exists/,
    code: "CLIENT_LINK_EXISTS",
    message: "Você já tem um vínculo com este cliente",
  },
  {
    match: "You can only schedule check-ins for your own clients",
    code: "NOT_CLIENT_OWNER",
    message: "Você só pode agendar check-ins para seus próprios clientes",
  },
  {
    match: "You can only view intake data for your own linked clients",
    code: "NOT_CLIENT_PROFESSIONAL",
    message: "Você só pode visualizar dados de clientes vinculados a você",
  },
  {
    match: /Only a pending link can be accepted/,
    code: "CANNOT_ACCEPT_LINK",
    message: "Apenas um convite pendente pode ser aceito",
  },
  {
    match: "This invite has expired",
    code: "INVITE_EXPIRED",
    message: "Este convite expirou",
  },
  {
    match: "You can only cancel check-in schedules you created",
    code: "CANNOT_CANCEL_CHECK_IN",
    message: "Você só pode cancelar agendamentos que criou",
  },
  {
    match: /Only an ACTIVE schedule can be cancelled/,
    code: "CANNOT_CANCEL_INACTIVE_SCHEDULE",
    message: "Apenas um agendamento ativo pode ser cancelado",
  },

  // ============================================================================
  // EXERCISES MODULE
  // ============================================================================
  {
    match: /Unknown contraindication tag/,
    code: "UNKNOWN_CONTRAINDICATION",
    message: "Tag de contraindicação desconhecida",
  },
  {
    match: "Exercise not found",
    code: "EXERCISE_NOT_FOUND",
    message: "Exercício não encontrado",
  },
  {
    match: "Global exercises can only be deleted by an admin",
    code: "CANNOT_DELETE_GLOBAL_EXERCISE",
    message: "Apenas um admin pode deletar exercícios globais",
  },
  {
    match: "Global exercises can only be edited by an admin",
    code: "CANNOT_EDIT_GLOBAL_EXERCISE",
    message: "Apenas um admin pode editar exercícios globais",
  },
  {
    match: "This exercise is already global",
    code: "EXERCISE_ALREADY_GLOBAL",
    message: "Este exercício já é global",
  },
  {
    match: "visibility must be PRIVATE or GLOBAL",
    code: "INVALID_VISIBILITY",
    message: "A visibilidade deve ser PRIVADA ou GLOBAL",
  },
  {
    match: "This exercise is used in a training plan and can't be deleted",
    code: "EXERCISE_IN_USE",
    message: "Este exercício está em uso em um plano de treino",
  },

  // ============================================================================
  // INTAKE MODULE
  // ============================================================================
  {
    match: "Intake assessment not found",
    code: "INTAKE_NOT_FOUND",
    message: "Avaliação de intake não encontrada",
  },
  {
    match: "This is not your intake assessment",
    code: "NOT_INTAKE_OWNER",
    message: "Este não é seu intake",
  },
  {
    match: "This intake is already finalized",
    code: "INTAKE_ALREADY_FINALIZED",
    message: "Este intake já foi finalizado",
  },
  {
    match: /Answer every readiness question before completing/,
    code: "INCOMPLETE_INTAKE_QUESTIONS",
    message: "Responda todas as perguntas antes de completar",
  },

  // ============================================================================
  // TRAINING PLANS MODULE
  // ============================================================================
  {
    match: "Client not found",
    code: "CLIENT_NOT_FOUND",
    message: "Cliente não encontrado",
  },
  {
    match: "This client's intake must be completed or skipped before a training plan can be created",
    code: "INTAKE_REQUIRED",
    message: "O cliente deve completar ou pular o intake antes de um plano de treino",
  },
  {
    match: "professionalId is required when an admin assigns a training plan",
    code: "PROFESSIONAL_ID_REQUIRED",
    message: "ID do profissional é necessário quando um admin atribui um plano",
  },
  {
    match: "professionalId must belong to a Personal Trainer",
    code: "INVALID_TRAINER_ID",
    message: "O ID deve pertencer a um Personal Trainer",
  },
  {
    match: "You can only assign training plans to your own linked clients",
    code: "NOT_TRAINER_OF_CLIENT",
    message: "Você só pode atribuir planos aos seus próprios clientes",
  },
  {
    match: "You can only manage your own clients' training plans",
    code: "CANNOT_MANAGE_PLAN",
    message: "Você só pode gerenciar planos dos seus próprios clientes",
  },
  {
    match: "Training plan not found",
    code: "PLAN_NOT_FOUND",
    message: "Plano de treino não encontrado",
  },
  {
    match: "Mesocycle not found",
    code: "MESOCYCLE_NOT_FOUND",
    message: "Mesociclo não encontrado",
  },
  {
    match: "Session not found",
    code: "SESSION_NOT_FOUND",
    message: "Sessão de treino não encontrada",
  },
  {
    match: "This session already has logged performance and its exercises can't be replaced",
    code: "CANNOT_REPLACE_LOGGED_SESSION",
    message: "Esta sessão já tem desempenho registrado, não pode ser alterada",
  },
  {
    match: "This mesocycle already has a session on that date",
    code: "SESSION_DATE_EXISTS",
    message: "Este mesociclo já tem uma sessão nessa data",
  },
  {
    match: "Starter template not found",
    code: "TEMPLATE_NOT_FOUND",
    message: "Template inicial não encontrado",
  },
  {
    match: "Clients with an active Personal Trainer can't self-assign a Starter Template",
    code: "CANNOT_SELF_ASSIGN_TEMPLATE",
    message: "Clientes com um Personal Trainer ativo não podem auto-atribuir templates",
  },
  {
    match: "Starter Templates have no dated Sessions to edit",
    code: "TEMPLATE_NO_SESSIONS",
    message: "Templates iniciais não têm sessões datadas para editar",
  },
  {
    match: /Unknown exercise:/,
    code: "UNKNOWN_EXERCISE",
    message: "Exercício desconhecido",
  },

  // ============================================================================
  // BODY ASSESSMENTS MODULE
  // ============================================================================
  {
    match: "You can only record or view body assessments for your own linked clients",
    code: "NOT_ASSESSMENT_PROFESSIONAL",
    message: "Você só pode visualizar avaliações dos seus clientes",
  },
  {
    match: "You can only upload photos to your own body assessment history",
    code: "NOT_ASSESSMENT_OWNER",
    message: "Você só pode fazer upload de fotos em sua própria avaliação",
  },
  {
    match: "This client's date of birth and biological sex must be on file before a formal assessment can be computed",
    code: "MISSING_CLIENT_DATA",
    message: "Dados do cliente (data de nascimento e sexo) são necessários",
  },

  // ============================================================================
  // CLIENT TRAINING EXECUTION MODULE
  // ============================================================================
  {
    match: "You can only view execution history for your own linked clients",
    code: "NOT_EXECUTION_PROFESSIONAL",
    message: "Você só pode visualizar o histórico dos seus clientes",
  },
  {
    match: "Cannot log a set against a cancelled session",
    code: "CANNOT_LOG_CANCELLED",
    message: "Não é possível registrar em uma sessão cancelada",
  },
  {
    match: "Session exercise not found",
    code: "SESSION_EXERCISE_NOT_FOUND",
    message: "Exercício da sessão não encontrado",
  },
  {
    match: "Cannot complete a cancelled session",
    code: "CANNOT_COMPLETE_CANCELLED",
    message: "Não é possível completar uma sessão cancelada",
  },

  // ============================================================================
  // NUTRITION MODULE
  // ============================================================================
  {
    match: "You can only manage nutrition targets for your own linked clients",
    code: "NOT_NUTRITION_PROFESSIONAL",
    message: "Você só pode gerenciar nutrição dos seus clientes",
  },
  {
    match: "This client's date of birth and biological sex must be on file before a nutrition draft can be generated",
    code: "MISSING_DATA_NUTRITION",
    message: "Dados do cliente são necessários para gerar um rascunho de nutrição",
  },
  {
    match: "This client needs at least one body assessment",
    code: "NO_BODY_ASSESSMENT",
    message: "O cliente precisa de pelo menos uma avaliação corporal",
  },
  {
    match: "Invalid activity level",
    code: "INVALID_ACTIVITY_LEVEL",
    message: "Nível de atividade inválido",
  },
  {
    match: "Food item not found",
    code: "FOOD_NOT_FOUND",
    message: "Alimento não encontrado",
  },
  {
    match: "Invalid food diary entry payload",
    code: "INVALID_FOOD_ENTRY",
    message: "Entrada de diário de alimentos inválida",
  },
  {
    match: "Nutrition plan not found",
    code: "NUTRITION_PLAN_NOT_FOUND",
    message: "Plano de nutrição não encontrado",
  },
  {
    match: "Cannot confirm an archived nutrition plan",
    code: "CANNOT_CONFIRM_ARCHIVED",
    message: "Não é possível confirmar um plano arquivado",
  },

  // ============================================================================
  // MESSAGING MODULE
  // ============================================================================
  {
    match: "Thread not found",
    code: "THREAD_NOT_FOUND",
    message: "Thread não encontrada",
  },
  {
    match: "Admin access to messaging is read-only support",
    code: "ADMIN_MESSAGING_READ_ONLY",
    message: "Acesso de admin ao messaging é apenas leitura",
  },
  {
    match: "This relationship has ended — the thread is read-only",
    code: "THREAD_READ_ONLY",
    message: "Este relacionamento terminou. A thread é apenas leitura",
  },
  {
    match: "Admins don't have a personal message inbox",
    code: "ADMIN_NO_INBOX",
    message: "Admins não têm uma caixa de entrada pessoal",
  },

  // ============================================================================
  // PRODUCTIVITY MODULE
  // ============================================================================
  {
    match: "Task not found",
    code: "TASK_NOT_FOUND",
    message: "Tarefa não encontrada",
  },
  {
    match: "Habit not found",
    code: "HABIT_NOT_FOUND",
    message: "Hábito não encontrado",
  },

  // ============================================================================
  // NOTIFICATIONS MODULE
  // ============================================================================
  {
    match: "Account-security notifications have no preferences",
    code: "NO_SECURITY_PREFS",
    message: "Notificações de segurança não têm preferências",
  },
  {
    match: "Unknown notification type",
    code: "UNKNOWN_NOTIFICATION_TYPE",
    message: "Tipo de notificação desconhecido",
  },
  {
    match: "Email delivery for account decisions cannot be disabled",
    code: "CANNOT_DISABLE_SECURITY_EMAIL",
    message: "Entrega por email para decisões de conta não pode ser desabilitada",
  },
];

export function translateExceptionMessage(
  rawMessage: string,
): TranslatedError | null {
  for (const entry of ERROR_REGISTRY) {
    const isMatch =
      typeof entry.match === "string"
        ? rawMessage.includes(entry.match)
        : entry.match.test(rawMessage);

    if (isMatch) {
      return { code: entry.code, message: entry.message };
    }
  }

  return null;
}
