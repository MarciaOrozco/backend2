import type {
  GetTurnosDisponiblesParams,
  GetTurnosDisponiblesResult,
} from "../types/agenda";
import { DomainError } from "../types/errors";
import {
  deleteDisponibilidadByNutricionista,
  findDisponibilidadByNutricionistaAndDia,
  insertDisponibilidad,
} from "../repositories/disponibilidadRepository";
import { findTurnosActivosByNutricionistaAndFecha } from "../repositories/turnoRepository";
import { GeneradorDeHorarios } from "./agenda/GeneradorDeHorarios";
import { crearEstrategia } from "./agenda/StrategyFactory";
import { ensureNutricionistaPropietario } from "../utils/vinculoUtils";
import { pool } from "../config/db";

export const getTurnosDisponibles = async (
  params: GetTurnosDisponiblesParams
): Promise<GetTurnosDisponiblesResult> => {
  const { nutricionistaId, fecha, dayName, estrategia, intervalo } = params;

  const disponibilidad = await findDisponibilidadByNutricionistaAndDia(
    undefined,
    nutricionistaId,
    dayName
  );

  if (!disponibilidad.length) {
    throw new DomainError(
      "El profesional no tiene disponibilidad para la fecha indicada",
      404
    );
  }

  const turnosExistentes = await findTurnosActivosByNutricionistaAndFecha(
    undefined,
    nutricionistaId,
    fecha
  );

  const intervaloDesdeQuery = intervalo ? Number(intervalo) : null;

  const slots = disponibilidad.flatMap((rango) => {
    const intervaloRango =
      intervaloDesdeQuery ??
      (rango.intervalo_minutos ? Number(rango.intervalo_minutos) : null) ??
      null;

    const estrategiaKey = intervaloRango ? `${intervaloRango}min` : undefined;
    const generador = new GeneradorDeHorarios(crearEstrategia(estrategiaKey));
    return generador.generar([rango], turnosExistentes);
  });

  const result: GetTurnosDisponiblesResult = {
    nutricionistaId,
    fecha,
    slots,
  };

  if (!slots.length) {
    result.message = "No hay turnos disponibles";
  }

  return result;
};

const VALID_DAY_NAMES = new Set([
  "lunes",
  "martes",
  "miercoles",
  "miércoles",
  "jueves",
  "viernes",
  "sabado",
  "sábado",
  "domingo",
]);

const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);
const VALID_INTERVALS = new Set([20, 30, 60]);

export const updateDisponibilidadNutricionista = async (
  nutricionistaId: number,
  rangos: {
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    intervaloMinutos?: number | null;
  }[],
  context: { userId: number; userRol: string; userNutricionistaId?: number | null }
) => {
  if (context.userRol !== "nutricionista") {
    throw new DomainError("No autorizado", 403);
  }

  await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? nutricionistaId
  );

  if (!Array.isArray(rangos) || !rangos.length) {
    throw new DomainError("Debe indicar al menos un rango de disponibilidad", 400);
  }

  const normalized = rangos.map((rango) => ({
    diaSemana: (rango.diaSemana ?? "").toLowerCase().trim(),
    horaInicio: rango.horaInicio,
    horaFin: rango.horaFin,
    intervaloMinutos: rango.intervaloMinutos
      ? Number(rango.intervaloMinutos)
      : null,
  }));

  for (const rango of normalized) {
    if (!VALID_DAY_NAMES.has(rango.diaSemana)) {
      throw new DomainError("Día de la semana inválido", 422);
    }
    if (!isValidTime(rango.horaInicio) || !isValidTime(rango.horaFin)) {
      throw new DomainError(
        "Formato de hora inválido. Use HH:MM en 24 horas",
        422
      );
    }
    if (
      rango.intervaloMinutos != null &&
      !VALID_INTERVALS.has(rango.intervaloMinutos)
    ) {
      throw new DomainError(
        "Intervalo inválido. Valores permitidos: 20, 30 o 60 minutos",
        422
      );
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await deleteDisponibilidadByNutricionista(connection, nutricionistaId);

    for (const rango of normalized) {
    await insertDisponibilidad(
      connection,
      nutricionistaId,
      rango.diaSemana,
      `${rango.horaInicio}:00`,
      `${rango.horaFin}:00`,
      rango.intervaloMinutos ?? null
    );
  }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
