import type { RowDataPacket } from "mysql2/promise";
import { ResenaDTO } from "./resena";

export interface NutricionistaCoreRow extends RowDataPacket {
  nutricionista_id: number;
  nombre: string | null;
  apellido: string | null;
  sobre_mi: string | null;
  reputacion_promedio: number | null;
}

export interface NutricionistaRow extends NutricionistaCoreRow {
  totalOpiniones: number | null;
  especialidades: string | null;
  modalidades: string | null;
}

export interface NutricionistaBaseRow extends NutricionistaCoreRow {
  usuario_id: number;
  email: string | null;
}

export interface NutricionistaFilters {
  nombre?: string;
  especialidad?: string;
  especialidades?: string[];
  modalidades?: string[];
}

export interface EspecialidadRow extends RowDataPacket {
  nombre: string;
}

export interface ModalidadRow extends RowDataPacket {
  modalidad_id: number;
  nombre: string;
}

export interface EducacionRow extends RowDataPacket {
  educacion_id: number;
  titulo: string;
  institucion: string;
  descripcion: string;
}

export interface ObraSocialRow extends RowDataPacket {
  obra_social_id: number;
  nombre: string;
}

export interface MetodoPagoRow extends RowDataPacket {
  metodo_pago_id: number;
  nombre: string;
  descripcion: string | null;
}

export interface NutricionistaDetalleDTO {
  nutricionista_id: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;

  sobre_mi: string | null;
  reputacion_promedio: number | null;

  especialidades: string[];
  modalidades: ModalidadRow[];
  educacion: EducacionRow[];
  metodosPago: MetodoPagoRow[];
  obrasSociales: ObraSocialRow[];
  resenas: ResenaDTO[];
  totalOpiniones: number;
}

export interface NutricionistaCardDTO {
  nutricionista_id: number;
  nombreCompleto: string;
  titulo: string | null;
  reputacionPromedio: number;
  totalOpiniones: number;
  especialidades: string[];
  modalidades: string[];
}
