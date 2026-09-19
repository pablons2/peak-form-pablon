import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Mailer } from "../domain/ports/mailer.port";

@Injectable()
export class NodemailerMailerService implements Mailer {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    // Local dev/CI point this at PRD 14's `mailhog` service (no auth, no
    // TLS); production would point SMTP_HOST/PORT at a real relay via the
    // same env vars — no code change needed either way.
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>("SMTP_HOST"),
      port: config.get<number>("SMTP_PORT", 1025),
      secure: false,
    });
    this.from = config.get<string>("SMTP_FROM", "no-reply@peakform.local");
  }

  async send(input: { to: string; subject: string; text: string }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }
}
