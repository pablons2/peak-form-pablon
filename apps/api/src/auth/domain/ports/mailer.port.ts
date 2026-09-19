export const MAILER = Symbol("MAILER");

export interface Mailer {
  send(input: { to: string; subject: string; text: string }): Promise<void>;
}
