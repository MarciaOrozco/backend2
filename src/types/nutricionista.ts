export interface NutricionistaFilters {
  nombre?: string;
  especialidad?: string;
  especialidades?: string[];
  modalidades?: string[];
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
