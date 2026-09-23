export const MAILER = Symbol("MAILER");

/// Transactional email port — moved from auth/ to this module in PRD 12,
/// per §5.1's "one place that renders and sends transactional email".
/// Still a deliberately tiny interface: the rendering lives in
/// domain/email-templates.ts, this is just the SMTP send boundary (faked
/// at the port in tests per PRD 15 §5.2).
export interface Mailer {
  send(input: { to: string; subject: string; text: string }): Promise<void>;
}
