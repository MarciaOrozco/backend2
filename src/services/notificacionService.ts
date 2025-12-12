import { createEmailService, EmailService } from "./EmailService";

interface EnviarInvitacionPacienteData {
  email: string;
  nombre: string;
  tokenInvitacion: string;
  fechaExpiracion: Date;
  pacienteId: number;
}

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL ??
  process.env.APP_BASE_URL ??
  "http://localhost:5173";

const buildRegistroLink = (email: string, token: string) => {
  const params = new URLSearchParams({
    email,
    token,
  });
  return `${FRONTEND_BASE_URL.replace(
    /\/$/,
    ""
  )}/register?${params.toString()}`;
};

export class NotificacionService {
  constructor(private emailService: EmailService) {}

  async enviarInvitacionRegistroPaciente(
    data: EnviarInvitacionPacienteData
  ): Promise<void> {
    const registroLink = buildRegistroLink(data.email, data.tokenInvitacion);

    try {
      await this.emailService.sendEmail({
        to: data.email,
        subject: "Te invitaron a registrarte en Nutrito",
        body: `Hola ${data.nombre},

Tu nutricionista te invitó a registrarte para ver tus planes y turnos.

Completá tu registro aquí: ${registroLink}

Este enlace expira el ${data.fechaExpiracion.toLocaleDateString()}.`,
      });
    } catch (error) {
      console.error("No se pudo enviar invitación de registro al paciente", {
        error,
        email: data.email,
        pacienteId: data.pacienteId,
      });
    }
  }
}

// Instancia por defecto para uso directo
export const notificacionService = new NotificacionService(
  createEmailService()
);

// Export función helper para backward compatibility
export const enviarInvitacionRegistroPaciente = (
  data: EnviarInvitacionPacienteData
) => notificacionService.enviarInvitacionRegistroPaciente(data);
