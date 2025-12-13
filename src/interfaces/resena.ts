import { RowDataPacket } from "mysql2/promise";

export interface ResenaDTO {
  resena_id: number;
  fecha: string;
  comentario: string;
  puntuacion: number;
  paciente: string;
}

export interface ResenaRow extends RowDataPacket {
  resena_id: number;
  fecha: string;
  comentario: string;
  puntuacion: number;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
}
