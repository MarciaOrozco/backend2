import { RowDataPacket } from "mysql2/promise";

export interface PacienteContacto {
  pacienteId: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  ciudad: string | null;
}

export interface PacienteContactoRow extends RowDataPacket {
  paciente_id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  ciudad: string | null;
}

export interface PlanPacienteResumen {
  id: number;
  fechaCreacion: string | null;
  ultimaActualizacion: string | null;
  fechaValidacion: string | null;
  estado: string | null;
  origen: string | null;
  titulo: string | null;
  notas: string | null;
}

export interface CrearPacienteManualData {
  nombre: string;
  apellido: string;
  email: string;
  tokenInvitacion: string;
  fechaExpiracion: Date;
  nutricionistaId: number;
}

export interface CrearPacienteManualResult {
  pacienteId: number;
  usuarioId: number;
  consultaTemporalId: number;
}

export interface PacienteRegistroRow extends RowDataPacket {
  paciente_id: number;
  usuario_id: number | null;
  token_invitacion: string | null;
  fecha_expiracion: Date | string | null;
  estado_registro: string | null;
}

export interface PlanPacienteRow extends RowDataPacket {
  plan_id: number;
  fecha_creacion: Date | string;
  ultima_actualizacion: Date | string | null;
  fecha_validacion: Date | string | null;
  estado: string | null;
  origen: string | null;
  titulo: string | null;
  notas: string | null;
}
