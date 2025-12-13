export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EnviarInvitacionPacienteData {
  email: string;
  nombre: string;
  tokenInvitacion: string;
  fechaExpiracion: Date;
  pacienteId: number;
}
