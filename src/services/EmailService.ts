export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

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
