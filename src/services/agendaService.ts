import type {
  GetTurnosDisponiblesParams,
  GetTurnosDisponiblesResult,
} from "../types/agenda";
import { DomainError } from "../types/errors";
import { findDisponibilidadByNutricionistaAndDia } from "../repositories/disponibilidadRepository";
import { findTurnosActivosByNutricionistaAndFecha } from "../repositories/turnoRepository";
import { GeneradorDeHorarios } from "./agenda/GeneradorDeHorarios";
import { crearEstrategia } from "./agenda/StrategyFactory";

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

  const estrategiaKey =
    estrategia ?? (intervalo ? `${intervalo}min` : undefined); // mismo criterio que antes

  const generador = new GeneradorDeHorarios(crearEstrategia(estrategiaKey));

  const slots = generador.generar(disponibilidad, turnosExistentes);

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
