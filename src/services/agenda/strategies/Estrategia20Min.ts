import {
  EstrategiaGeneracion,
  HorarioDisponible,
  RangoDisponibilidad,
  TurnoExistente,
} from "./EstrategiaGeneracion";
import { normalizarHora, toMinutes, toTime } from "./base";

/**
 * Estrategia que genera horarios cada 20 minutos.
 */
export class Estrategia20Min implements EstrategiaGeneracion {
  private readonly intervalo = 20;

  generarHorarios(
    disponibilidad: RangoDisponibilidad[],
    turnosOcupados: TurnoExistente[] = [],
  ): HorarioDisponible[] {
    const ocupados = new Set(
      turnosOcupados.map((turno) => normalizarHora(turno.hora)),
    );

    const slots: HorarioDisponible[] = [];

    disponibilidad.forEach((rango) => {
      let cursor = toMinutes(rango.hora_inicio);
      const fin = toMinutes(rango.hora_fin);

      while (cursor < fin) {
        const hora = toTime(cursor);
        if (!ocupados.has(hora)) {
          slots.push({
            hora,
            etiqueta: `${hora} hs`,
            dia_semana: rango.dia_semana,
          });
        }
        cursor += this.intervalo;
      }
    });

    return slots.sort((a, b) => a.hora.localeCompare(b.hora));
  }
}
