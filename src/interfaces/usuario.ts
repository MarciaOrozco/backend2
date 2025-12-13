import { RowDataPacket } from "mysql2/promise";

export interface UsuarioBaseRow extends RowDataPacket {
  usuario_id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  rol_id: number | null;
  rol: string | null;
}

export interface UsuarioAuthRow extends UsuarioBaseRow {
  password: string;
}

export interface UsuarioProfileRow extends UsuarioBaseRow {
  paciente_id: number | null;
  nutricionista_id: number | null;
}

export interface UpdateUsuarioAuthPayload {
  usuarioId: number;
  nombre: string | null;
  apellido: string | null;
  password: string;
  telefono?: string | null;
}

export interface CreateUsuarioPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string | null;
  rolId: number;
}
