import {
  EstrategiaGeneracion,
  HorarioDisponible,
  RangoDisponibilidad,
  TurnoExistente,
} from "./strategies/EstrategiaGeneracion";

/**
 * Contexto del patrón Strategy. Recibe una estrategia concreta y la utiliza
 * para generar horarios según la disponibilidad del profesional.
 *
 * Uso:
 * const generador = new GeneradorDeHorarios(new Estrategia30Min());
 * const horarios = generador.generar(disponibilidad, turnosOcupados);
 */
export class GeneradorDeHorarios {
  constructor(private estrategia: EstrategiaGeneracion) {}

  establecerEstrategia(estrategia: EstrategiaGeneracion) {
    this.estrategia = estrategia;
  }

  generar(
    disponibilidad: RangoDisponibilidad[],
    turnosOcupados: TurnoExistente[] = [],
  ): HorarioDisponible[] {
    return this.estrategia.generarHorarios(disponibilidad, turnosOcupados);
  }
}
