import type {
  GetTurnosDisponiblesParams,
  GetTurnosDisponiblesResult,
  HorarioDisponible,
  RangoDisponibilidad,
  TurnoExistente,
} from "../interfaces/agenda";
import { DomainError } from "../interfaces/errors";
import {
  deleteDisponibilidadByNutricionista,
  findDisponibilidadByNutricionistaAndDia,
  insertDisponibilidad,
} from "../repositories/disponibilidadRepository";
import { findTurnosActivosByNutricionistaAndFecha } from "../repositories/turnoRepository";
import { ensureNutricionistaPropietario } from "../utils/vinculoUtils";
import { pool } from "../config/db";

const DEFAULT_INTERVAL = 30;
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

const VALID_INTERVALS = new Set([20, 30, 60]);

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const toTime = (minutesTotal: number) => {
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

const normalizarHora = (value: string) => value.slice(0, 5);

const parseInterval = (value?: string | null) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolverIntervalo = (
  override?: number | null,
  rangoIntervalo?: number | null
) => {
  const intervalo =
    override ??
    (rangoIntervalo != null ? Number(rangoIntervalo) : null) ??
    DEFAULT_INTERVAL;

  return VALID_INTERVALS.has(intervalo) ? intervalo : DEFAULT_INTERVAL;
};

const generarSlots = (
  disponibilidad: RangoDisponibilidad[],
  turnosOcupados: TurnoExistente[],
  intervaloOverride?: number | null
): HorarioDisponible[] => {
  const ocupados = new Set(
    turnosOcupados.map((turno) => normalizarHora(turno.hora))
  );

  const slots: HorarioDisponible[] = [];

  for (const rango of disponibilidad) {
    const intervalo = resolverIntervalo(
      intervaloOverride,
      rango.intervalo_minutos ?? null
    );

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
      cursor += intervalo;
    }
  }

  return slots.sort((a, b) => a.hora.localeCompare(b.hora));
};

export const getTurnosDisponibles = async (
  params: GetTurnosDisponiblesParams
): Promise<GetTurnosDisponiblesResult> => {
  const { nutricionistaId, fecha, dayName, intervalo } = params;

  const disponibilidad = await findDisponibilidadByNutricionistaAndDia(
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

  const intervaloDesdeQuery = parseInterval(intervalo);

  const slots = generarSlots(
    disponibilidad,
    turnosExistentes,
    intervaloDesdeQuery
  );

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

const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

export const updateDisponibilidadNutricionista = async (
  nutricionistaId: number,
  rangos: {
    diaSemana: string;
    horaInicio: string;
    horaFin: string;
    intervaloMinutos?: number | null;
  }[],
  context: {
    userId: number;
    userRol: string;
    userNutricionistaId?: number | null;
  }
) => {
  if (context.userRol !== "nutricionista") {
    throw new DomainError("No autorizado", 403);
  }

  await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? nutricionistaId
  );

  if (!Array.isArray(rangos) || !rangos.length) {
    throw new DomainError(
      "Debe indicar al menos un rango de disponibilidad",
      400
    );
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
