import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { EmailMessage } from "../interfaces/emailNotificacion";

dotenv.config();

export interface EmailService {
  sendEmail(message: EmailMessage): Promise<void>;
}

/**
 * Implementación por defecto que deja trazas en consola.
 * Sustituirla por un adaptador real (nodemailer, etc.) en infraestructura.
 */
export class ConsoleEmailService implements EmailService {
  async sendEmail(message: EmailMessage): Promise<void> {
    const { to, subject, body } = message;
    // En entornos reales reemplazar por el proveedor concreto.
    console.info(`[Email] to=${to} subject="${subject}" body="${body}"`);
  }
}

export class NodemailerEmailService implements EmailService {
  private transporter;
  private from: string;

  constructor({ user, pass }: { user: string; pass: string }) {
    this.from = user;
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const { to, subject, body } = message;
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      text: body,
    });
  }
}

export const createEmailService = (): EmailService => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    return new NodemailerEmailService({ user, pass });
  }

  console.warn(
    "EMAIL_USER o EMAIL_PASS no configurados; se usará ConsoleEmailService."
  );
  return new ConsoleEmailService();
};
