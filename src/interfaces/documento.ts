import { RowDataPacket } from "mysql2/promise";

export interface DocumentoRow extends RowDataPacket {
  documento_id: number;
  descripcion: string | null;
  ruta_archivo: string;
  fecha: Date | string | null;
}

export interface InsertDocumentoParams {
  pacienteId: number;
  descripcion: string;
  rutaArchivo: string;
  fecha: string;
  consultaId?: number | null;
}

export interface CrearDocumentosPayload {
  pacienteId?: number;
  descripcion?: string;
}

export interface DocumentoSubido {
  nombre: string;
  ruta: string;
}

export interface DocumentoPaciente {
  id: number;
  descripcion: string | null;
  ruta: string;
  fecha: string | null;
}
