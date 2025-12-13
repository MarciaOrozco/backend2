import { RowDataPacket } from "mysql2/promise";

export interface Turno {
  id: number;
  fecha: string;
  hora: string;
  paciente: TurnoParticipante;
  nutricionista: TurnoParticipante;
  modalidadId?: number | null;
  metodoPagoId?: number | null;
  estadoTurnoId?: number | null;
}

export interface TurnoBaseRow extends RowDataPacket {
  turno_id: number;
  fecha: Date | string;
  hora: string | null;
  estado_turno_id: number;
  modalidad_id?: number | null;
}

export interface TurnoPacienteRow extends TurnoBaseRow {
  estado: string;
  modalidad: string | null;
  nutricionista_id: number;
  nutricionista_nombre: string;
  nutricionista_apellido: string;
}

export interface TurnoNutricionistaRow extends TurnoBaseRow {
  estado: string;
  modalidad: string | null;
  paciente_id: number;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
  paciente_email: string | null;
}

export interface TurnoRow extends TurnoBaseRow {
  paciente_id: number;
  nutricionista_id: number;
}

export interface TurnoDetalleRow extends TurnoBaseRow {
  paciente_id: number;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
  paciente_email: string | null;
  nutricionista_id: number;
  nutricionista_nombre: string | null;
  nutricionista_apellido: string | null;
  nutricionista_email: string | null;
  metodo_pago_id: number | null;
}

export interface CreateTurnoPayload {
  fecha: string;
  hora: string;
  pacienteId: number;
  nutricionistaId: number;
  modalidadId?: number | null;
  metodoPagoId?: number | null;
}

export interface CreateTurnoResult {
  turnoId: number;
  calendarLink?: string | null;
  icsContent?: string | null;
}

export interface TurnoParticipante {
  id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
}
export interface EventoTurnoPayload {
  mensaje?: string;
}

export interface TurnoExistenteRow extends RowDataPacket {
  hora: string;
}

export interface TurnoVinculoRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}

export enum EventoTurno {
  CREADO = "CREADO",
  CANCELADO = "CANCELADO",
  REPROGRAMADO = "REPROGRAMADO",
}
