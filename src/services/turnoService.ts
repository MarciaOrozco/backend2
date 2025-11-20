import type { CreateTurnoPayload, CreateTurnoResult } from "../types/turno";
import { DomainError } from "../types/errors";
import {
  createTurno as createTurnoRepository,
  existsTurnoActivoEnHorarioExcepto,
  findTurnoById,
  findTurnosByPacienteId,
  insertTurnoLogEvento,
  updateTurnoEstado,
  updateTurnoFechaHoraYEstado,
} from "../repositories/turnoRepository";
import {
  ensureNutricionistaPropietario,
  ensurePacientePropietario,
} from "../utils/vinculoUtils";
import { vincularPacienteProfesional } from "./vinculacionService";
import { assertVinculoActivo } from "../repositories/vinculoRepository";
import { ensurePacientePropietarioByUser } from "../utils/ownershipService";
import { pool } from "../config/db";
import { RangoDisponibilidad } from "../types/agenda";
import { findDisponibilidadByNutricionistaAndDia } from "../repositories/disponibilidadRepository";

interface CreateTurnoContext {
  userRol: string;
  userId: number;
}

/**
 * Función interna que encapsula solo la creación de la fila en BD.
 * Reemplaza al viejo `crearTurnoInterno` del controller.
 */
export const crearTurnoInterno = async (
  payload: CreateTurnoPayload
): Promise<number> => {
  const turnoId = await createTurnoRepository(undefined, payload);
  return turnoId;
};

/**
 * Caso de uso completo: crear un turno desde una petición HTTP.
 * Valida rol, propietario, vínculo y dispara notificaciones.
 */
export const createTurno = async (
  payload: CreateTurnoPayload,
  context: CreateTurnoContext
): Promise<CreateTurnoResult> => {
  const { userRol, userId } = context;
  let pacienteIdValue = payload.pacienteId;

  if (userRol === "paciente") {
    const pacienteAsociado = await ensurePacientePropietario(
      userId,
      pacienteIdValue
    );
    pacienteIdValue = pacienteAsociado;
  } else if (userRol === "nutricionista") {
    await ensureNutricionistaPropietario(userId, payload.nutricionistaId);
    await assertVinculoActivo(pacienteIdValue, payload.nutricionistaId);
  } else {
    throw new DomainError("No autorizado", 403);
  }

  const turnoId = await crearTurnoInterno({
    ...payload,
    pacienteId: pacienteIdValue,
  });

  //   await notificarTurnoConfirmado(turnoId);
  await vincularPacienteProfesional(turnoId);

  return { turnoId };
};

const formatDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return String(value);
};

const mapTurnoPaciente = (row: any) => ({
  id: row.turno_id,
  fecha: formatDate(row.fecha),
  hora: row.hora ? row.hora.toString().slice(0, 5) : null,
  estado: row.estado,
  estadoId: row.estado_turno_id,
  modalidadId: row.modalidad_id,
  modalidad: row.modalidad,
  nutricionista: {
    id: row.nutricionista_id,
    nombre: row.nutricionista_nombre,
    apellido: row.nutricionista_apellido,
  },
});

export const obtenerTurnosPaciente = async (pacienteId: number) => {
  const rows = await findTurnosByPacienteId(undefined, pacienteId);

  const now = new Date();
  let proximoTurno: any = null;
  const historial: any[] = [];

  rows.forEach((row: any) => {
    const turno = mapTurnoPaciente(row);

    const turnoDate = new Date(`${turno.fecha}T${turno.hora ?? "00:00"}`);
    const esActivo = [1, 2].includes(Number(turno.estadoId ?? 0));
    const esFuturo = turnoDate.getTime() >= now.getTime();

    if (!proximoTurno && esActivo && esFuturo) {
      proximoTurno = turno;
    } else {
      historial.push(turno);
    }
  });

  return { proximoTurno, historial };
};

interface TurnoActionContext {
  userId: number;
  userRol: string;
}

/**
 * Cancelación de turno por paciente.
 * - Verifica que el turno exista
 * - Verifica que el usuario sea el paciente dueño
 * - Marca el turno como cancelado (estado 3)
 * - Inserta un log de evento
 */
export const cancelarTurnoService = async (
  turnoId: number,
  motivo: string | undefined,
  context: TurnoActionContext
): Promise<void> => {
  if (context.userRol !== "paciente") {
    throw new DomainError("No autorizado", 403);
  }

  const turno = await findTurnoById(pool, turnoId);
  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  // Verifica que el paciente del token sea el mismo del turno
  await ensurePacientePropietarioByUser(context.userId, turno.paciente_id);

  // Si ya está cancelado, podrías devolver ok o lanzar error; acá lo dejamos idempotente
  if (turno.estado_turno_id === 3) {
    return;
  }

  await updateTurnoEstado(pool, turnoId, 3);

  const mensaje = `Turno cancelado por el paciente. Motivo: ${
    motivo ?? "No indicado"
  }`;

  await insertTurnoLogEvento(pool, turnoId, mensaje);
};

interface TurnoActionContext {
  userId: number;
  userRol: string;
}

const horaDentroDeRangos = (
  hora: string,
  rangos: RangoDisponibilidad[]
): boolean => {
  return rangos.some((r) => {
    const inicio = String(r.hora_inicio).slice(0, 5); // "HH:MM"
    const fin = String(r.hora_fin).slice(0, 5);
    const h = hora.slice(0, 5);
    return inicio <= h && h <= fin;
  });
};

export const reprogramarTurnoService = async (
  turnoId: number,
  nuevaFecha: string,
  nuevaHora: string,
  context: TurnoActionContext
): Promise<void> => {
  if (context.userRol !== "paciente") {
    throw new DomainError("No autorizado", 403);
  }

  // 1) Buscar turno
  const turno = await findTurnoById(pool, turnoId);
  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  // 2) Verificar que el usuario sea el paciente dueño
  await ensurePacientePropietarioByUser(context.userId, turno.paciente_id);

  // 3) Validar fecha
  const targetDate = new Date(nuevaFecha);
  if (Number.isNaN(targetDate.getTime())) {
    throw new DomainError("Fecha inválida", 400);
  }

  // 4) Obtener día de la semana en español (coherente con getTurnosDisponibles)
  const diaSemana = targetDate
    .toLocaleDateString("es-ES", { weekday: "long" })
    .toLowerCase();

  // 5) Verificar disponibilidad del profesional ese día
  const rangos = await findDisponibilidadByNutricionistaAndDia(
    pool,
    turno.nutricionista_id,
    diaSemana
  );

  if (!rangos.length || !horaDentroDeRangos(nuevaHora, rangos)) {
    throw new DomainError(
      "El profesional no tiene disponibilidad en el horario indicado",
      400
    );
  }

  // 6) Verificar que no haya otro turno activo en ese horario
  const ocupado = await existsTurnoActivoEnHorarioExcepto(
    pool,
    turno.nutricionista_id,
    nuevaFecha,
    nuevaHora,
    turnoId
  );

  if (ocupado) {
    throw new DomainError("El horario solicitado ya está reservado", 409);
  }

  // 7) Actualizar turno
  await updateTurnoFechaHoraYEstado(pool, turnoId, nuevaFecha, nuevaHora, 2);

  // 8) Log
  await insertTurnoLogEvento(
    pool,
    turnoId,
    "Turno reprogramado por el paciente"
  );
};
