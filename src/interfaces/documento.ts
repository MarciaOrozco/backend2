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

export interface CrearDocumentosContext {
  userId: number;
  userRol: string;
}

export interface DocumentoSubido {
  nombre: string;
  ruta: string;
}
