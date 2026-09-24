import { NotificationType } from "@prisma/client";

// PRD 12 §5.1/§5.4 — the single place that renders notification text.
// `describe` produces the in-app list's title/body (also reused as the push
// payload); `renderEmail` wraps the same content as a transactional email.
// pt-BR, matching the product's user-facing language everywhere else.
//
// The two account-security templates are the *same verbatim texts* PRD 01
// has sent since Phase 3 — the BDD suite's FakeMailer.tokenSentTo extracts
// the raw 64-hex token straight out of this exact wording, so rewording
// them is a test-contract break, not a cosmetic change.

export interface RenderedNotification {
  title: string;
  body: string;
}

export function describeNotification(
  type: NotificationType,
  payload: Record<string, unknown>,
): RenderedNotification {
  switch (type) {
    case NotificationType.SESSION_REMINDER:
      return {
        title: "Treino de hoje",
        body: "Você tem uma sessão de treino agendada para hoje.",
      };
    case NotificationType.MISSED_SESSION:
      return {
        title: "Sessão perdida",
        body: "A sessão agendada para ontem ficou sem registro e foi marcada como perdida.",
      };
    case NotificationType.MISSED_FOOD_LOG:
      return {
        title: "Diário alimentar",
        body: "Você não registrou nenhuma refeição ontem.",
      };
    case NotificationType.NEW_MESSAGE:
      return {
        title: `Nova mensagem de ${String(payload.senderName ?? "seu contato")}`,
        body: String(payload.preview ?? ""),
      };
    case NotificationType.PLAN_UPDATED:
      return payload.planKind === "NUTRITION"
        ? {
            title: "Plano de nutrição atualizado",
            body: "Seu nutricionista atualizou seu plano de nutrição.",
          }
        : {
            title: "Plano de treino atualizado",
            body: "Seu treinador atualizou seu plano de treino.",
          };
    case NotificationType.WEEKLY_SUMMARY_READY:
      return payload.forProfessional === true
        ? {
            title: "Resumo semanal do cliente",
            body: "O resumo semanal do seu cliente já está disponível.",
          }
        : {
            title: "Resumo semanal pronto",
            body: "Seu resumo da semana já está disponível no painel.",
          };
    case NotificationType.CHECK_IN_DUE:
      return {
        title: "Check-in pendente",
        body:
          payload.note != null && String(payload.note).length > 0
            ? `Seu profissional pediu um check-in: ${String(payload.note)}`
            : "Seu profissional pediu um check-in.",
      };
    case NotificationType.APPROVAL_DECISION:
      return payload.decision === "APPROVED"
        ? {
            title: "Conta aprovada",
            body: "Sua conta de profissional foi aprovada. Você já pode usar o PeakForm.",
          }
        : {
            title: "Conta não aprovada",
            body:
              payload.reason != null && String(payload.reason).length > 0
                ? `Sua conta de profissional não foi aprovada. Motivo: ${String(payload.reason)}`
                : "Sua conta de profissional não foi aprovada.",
          };
    case NotificationType.EMAIL_VERIFICATION:
      return {
        title: "Verifique seu e-mail",
        body: "Enviamos um token de verificação para o seu e-mail.",
      };
    case NotificationType.PASSWORD_RESET:
      return {
        title: "Redefinição de senha",
        body: "Enviamos um token de redefinição de senha para o seu e-mail.",
      };
    default:
      const exhaustive: never = type;
      throw new Error(`Unknown notification type: ${exhaustive}`);
  }
}

export function renderEmail(
  type: NotificationType,
  payload: Record<string, unknown>,
): { subject: string; text: string } {
  // Account-security email text is rendered separately (it embeds the raw
  // token, which is only meaningful to the recipient's inbox, not the
  // in-app list).
  const { title, body } = describeNotification(type, payload);
  const text = body.length > 0 ? `${body}\n\n— PeakForm` : `${title}\n\n— PeakForm`;
  return { subject: `PeakForm — ${title}`, text };
}

/// §5.1's synchronous account-security path — the templates PRD 01's flows
/// call through SendAccountSecurityNotificationUseCase. Kept byte-for-byte
//  identical to the texts auth used to inline (see file header).
export function renderSecurityEmail(
  type: Extract<NotificationType, "EMAIL_VERIFICATION" | "PASSWORD_RESET">,
  input: { token: string; extraText?: string },
): { subject: string; text: string } {
  if (type === NotificationType.PASSWORD_RESET) {
    return {
      subject: "Reset your PeakForm password",
      text: `Use this token to reset your password: ${input.token}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    };
  }
  return {
    subject: "Verify your PeakForm email",
    text:
      `Welcome to PeakForm! Verify your email using this token: ${input.token}` +
      (input.extraText ? `\n\n${input.extraText}` : ""),
  };
}
