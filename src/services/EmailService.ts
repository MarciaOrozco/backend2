import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { EmailMessage } from "../interfaces/emailNotificacion";

dotenv.config();

export interface EmailService {
  sendEmail(message: EmailMessage): Promise<void>;
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

  if (!user || !pass) {
    throw new Error("EMAIL_USER y EMAIL_PASS son requeridos para enviar emails");
  }

  return new NodemailerEmailService({ user, pass });
};
