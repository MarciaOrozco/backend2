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

export const nombreCompleto = (p: TurnoParticipante): string =>
  [p.nombre, p.apellido].filter(Boolean).join(" ").trim();

export enum EventoTurno {
  CREADO = "CREADO",
  CANCELADO = "CANCELADO",
  REPROGRAMADO = "REPROGRAMADO",
}

export interface EventoTurnoPayload {
  mensaje?: string;
}
