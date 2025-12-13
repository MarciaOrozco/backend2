import { RowDataPacket } from "mysql2/promise";
import { DocumentoConsultaRow } from "./documento";

export interface ConsultaEvolucionBase {
  fecha_consulta: Date | string | null;
  peso: number | null;
  imc: number | null;
  cintura: number | null;
  porcentaje_grasa: number | null;
  meta_peso: number | null;
}

/* --- Listado de consultas (para página de consultas del paciente) --- */
export interface ConsultaListadoRow extends RowDataPacket {
  consulta_id: number;
  fecha_consulta: Date | string | null;
  estado: string;
  resumen: string | null;
  nutricionista_id: number;
}

/* --- Consulta por id (detalle/edición) --- */
export interface ConsultaRow extends RowDataPacket {
  consulta_id: number;
  paciente_id: number;
  nutricionista_id: number;
  fecha_consulta: Date | string | null;
  estado: string;
  motivo: string | null;
  antecedentes: string | null;
  objetivos: string | null;
  peso: number | null;
  altura: number | null;
  imc: number | null;
  cintura: number | null;
  cadera: number | null;
  porcentaje_grasa: number | null;
  porcentaje_magra: number | null;
  meta_peso: number | null;
  meta_semanal: number | null;
  observaciones_medidas: string | null;
  resumen: string | null;
  diagnostico: string | null;
  indicaciones: string | null;
  observaciones_internas: string | null;
  visibilidad_notas: string | null;
}

/* --- Evolución del paciente (gráficos, informes) --- */
export interface ConsultaEvolucionRow
  extends RowDataPacket,
    ConsultaEvolucionBase {}

/* --- Documentos asociados a la consulta --- */

export interface HistorialPesoRow extends RowDataPacket {
  fecha: Date | string | null;
  peso: number | null;
}

export interface ConsultaExportPayload {
  consulta: ConsultaRow;
  documentos: DocumentoConsultaRow[];
  historialPeso: HistorialPesoRow[];
  secciones?: string[];
}

export interface RegistroEvolucion {
  fecha_consulta: string | null;
  peso: number | null;
  imc: number | null;
  cintura: number | null;
  porcentaje_grasa: number | null;
  meta_peso: number | null;
}
