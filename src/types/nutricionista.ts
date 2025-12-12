import type { RowDataPacket } from "mysql2/promise";

export interface NutricionistaFilters {
  nombre?: string;
  especialidad?: string;
  especialidades?: string[];
  modalidades?: string[];
}

export interface NutricionistaRow extends RowDataPacket {
  nutricionista_id: number;
  nombre: string | null;
  apellido: string | null;
  sobre_mi: string | null;
  reputacion_promedio: number | null;
  totalOpiniones: number | null;
  especialidades: string | null;
  modalidades: string | null;
}

export interface NutricionistaBaseRow extends RowDataPacket {
  nutricionista_id: number;
  usuario_id: number;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  sobre_mi: string | null;
  reputacion_promedio: number | null;
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

export interface ResenaRow extends RowDataPacket {
  resena_id: number;
  fecha: string;
  comentario: string;
  puntuacion: number;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
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
  modalidades: { modalidad_id: number; nombre: string }[];
  educacion: {
    educacion_id: number;
    titulo: string;
    institucion: string;
    descripcion: string;
  }[];

  metodosPago: {
    metodo_pago_id: number;
    nombre: string;
    descripcion: string | null;
  }[];

  obrasSociales: { obra_social_id: number; nombre: string }[];

  resenas: {
    resena_id: number;
    fecha: string;
    comentario: string;
    puntuacion: number;
    paciente: string;
  }[];

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
