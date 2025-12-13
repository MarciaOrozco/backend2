import { RowDataPacket } from "mysql2/promise";

export interface RelacionPacienteProfesionalRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}

export interface CrearVinculacionPayload {
  pacienteId?: number;
  nutricionistaId: number;
}

export interface CrearVinculacionContext {
  usuarioId?: number; // si viene autenticado
}

/* --- Pacientes vinculados a un nutricionista --- */
export interface PacienteVinculadoRow extends RowDataPacket {
  paciente_id: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  estado_registro: string | null;
  fecha_invitacion: Date | string | null;
  fecha_expiracion: Date | string | null;
}
