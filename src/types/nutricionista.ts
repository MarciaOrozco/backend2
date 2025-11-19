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
