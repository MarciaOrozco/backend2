import type {
  NutricionistaFilters,
  NutricionistaCardDTO,
  NutricionistaDetalleDTO,
} from "../types/nutricionista";

import {
  findNutricionistaBaseById,
  findEspecialidadesByNutricionista,
  findModalidadesByNutricionista,
  findEducacionByNutricionista,
  findMetodosPagoByNutricionista,
  findObrasSocialesByNutricionista,
  findResenasByNutricionista,
  findNutricionistas,
} from "../repositories/nutricionistaRepository";

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

export const getNutricionistaById = async (
  id: number
): Promise<NutricionistaDetalleDTO | null> => {
  const base = await findNutricionistaBaseById(id);
  if (!base) {
    return null;
  }

  const [
    especialidades,
    modalidades,
    educacion,
    metodosPago,
    obrasSociales,
    resenasRaw,
  ] = await Promise.all([
    findEspecialidadesByNutricionista(id),
    findModalidadesByNutricionista(id),
    findEducacionByNutricionista(id),
    findMetodosPagoByNutricionista(id),
    findObrasSocialesByNutricionista(id),
    findResenasByNutricionista(id),
  ]);

  const resenas = resenasRaw.map((r) => ({
    resena_id: r.resena_id,
    fecha: r.fecha,
    comentario: r.comentario,
    puntuacion: r.puntuacion,
    paciente: `${r.paciente_nombre ?? ""} ${r.paciente_apellido ?? ""}`
      .trim()
      .replace(/\s+/g, " ")
      .trim(),
  }));

  return {
    nutricionista_id: base.nutricionista_id,
    nombre: base.nombre,
    apellido: base.apellido,
    email: base.email,

    sobre_mi: base.sobre_mi,
    reputacion_promedio: base.reputacion_promedio,

    especialidades,
    modalidades,
    educacion,
    metodosPago,
    obrasSociales,

    resenas,
    totalOpiniones: resenas.length,
  };
};
