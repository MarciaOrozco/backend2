import type {
  NutricionistaFilters,
  NutricionistaCardDTO,
} from "../types/nutricionista";
import { findNutricionistas } from "../repositories/nutricionistaRepository";

export const getNutricionistas = async (
  filters: NutricionistaFilters
): Promise<NutricionistaCardDTO[]> => {
  const rows = await findNutricionistas(filters);

  return rows.map((row) => ({
    nutricionista_id: row.nutricionista_id,
    nombreCompleto: `${row.nombre ?? ""} ${row.apellido ?? ""}`.trim(),
    titulo: row.sobre_mi,
    reputacionPromedio: Number(row.reputacion_promedio ?? 0),
    totalOpiniones: Number(row.totalOpiniones ?? 0),
    especialidades: row.especialidades
      ? String(row.especialidades)
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean)
      : [],
    modalidades: row.modalidades
      ? String(row.modalidades)
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean)
      : [],
  }));
};
