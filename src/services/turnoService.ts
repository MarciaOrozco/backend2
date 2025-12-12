import type {
  CreateTurnoPayload,
  CreateTurnoResult,
  Turno,
} from "../types/turno";
import { DomainError } from "../types/errors";
import {
  createTurno as createTurnoRepository,
  existsTurnoActivoEnHorarioExcepto,
  findTurnoById,
  findTurnoDetalleById,
  findTurnosByPacienteId,
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
import { GestorEventosTurno } from "../core/turno/GestorEventosTurno";
import { NotificadorEmailListener } from "../core/turno/NotificadorEmailListener";
import { LoggingTurnoListener } from "../core/turno/LoggingTurnoListener";

import { EventoTurno, EventoTurnoPayload } from "../types/turno";
import { createEmailService } from "./EmailService";
import { buildCalendarDataFromTurno } from "../utils/calendarUtils";
import { formatDate, formatHora } from "../utils/dateUtils";

interface CreateTurnoContext {
  userRol: string;
  userId: number;
}
interface TurnoActionNutriContext {
  userId: number;
  userRol: string;
  userNutricionistaId?: number | null;
}

const gestorEventosTurno = new GestorEventosTurno();
const emailService = createEmailService();
const notificadorEmailListener = new NotificadorEmailListener(emailService);
const loggingTurnoListener = new LoggingTurnoListener();

gestorEventosTurno.subscribe(EventoTurno.CREADO, notificadorEmailListener);
gestorEventosTurno.subscribe(EventoTurno.CANCELADO, notificadorEmailListener);
gestorEventosTurno.subscribe(
  EventoTurno.REPROGRAMADO,
  notificadorEmailListener
);
gestorEventosTurno.subscribe(EventoTurno.CREADO, loggingTurnoListener);
gestorEventosTurno.subscribe(EventoTurno.CANCELADO, loggingTurnoListener);
gestorEventosTurno.subscribe(EventoTurno.REPROGRAMADO, loggingTurnoListener);

const notificarEventoTurno = async (
  turnoId: number,
  evento: EventoTurno,
  payload?: EventoTurnoPayload
): Promise<void> => {
  const turno = await buildTurnoDominio(turnoId);
  await gestorEventosTurno.notify(evento, turno, payload);
};

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

  const turnoId = await createTurnoRepository({
    ...payload,
    pacienteId: pacienteIdValue,
  });

  await vincularPacienteProfesional(turnoId);

  await notificarEventoTurno(turnoId, EventoTurno.CREADO);

  const turno = await buildTurnoDominio(turnoId);
  const calendarData = buildCalendarDataFromTurno(turno);

  return { turnoId, ...calendarData };
};

const buildTurnoDominio = async (turnoId: number): Promise<Turno> => {
  const detalle = await findTurnoDetalleById(pool, turnoId);

  if (!detalle) {
    throw new DomainError("Turno no encontrado", 404);
  }

  return {
    id: detalle.turno_id,
    fecha: formatDate(detalle.fecha) ?? "",
    hora: formatHora(detalle.hora),
    paciente: {
      id: detalle.paciente_id,
      nombre: detalle.paciente_nombre,
      apellido: detalle.paciente_apellido,
      email: detalle.paciente_email ?? "",
    },
    nutricionista: {
      id: detalle.nutricionista_id,
      nombre: detalle.nutricionista_nombre,
      apellido: detalle.nutricionista_apellido,
      email: detalle.nutricionista_email ?? "",
    },
    modalidadId: detalle.modalidad_id,
    metodoPagoId: detalle.metodo_pago_id ?? null,
    estadoTurnoId: detalle.estado_turno_id ?? null,
  };
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

export const cancelarTurnoService = async (
  turnoId: number,
  motivo: string | undefined,
  context: CreateTurnoContext
): Promise<void> => {
  const turno = await findTurnoById(turnoId);
  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  await ensurePacientePropietarioByUser(context.userId, turno.paciente_id);

  if (turno.estado_turno_id === 3) {
    throw new DomainError("El turno ya se encuentra cancelado", 400);
  }

  await updateTurnoEstado(turnoId, 3);

  const mensaje = `Turno cancelado por el paciente. Motivo: ${
    motivo ?? "No indicado"
  }`;

  await notificarEventoTurno(turnoId, EventoTurno.CANCELADO, { mensaje });
};

export const cancelarTurnoNutricionistaService = async (
  turnoId: number,
  motivo: string | undefined,
  context: TurnoActionNutriContext
): Promise<void> => {
  const turno = await findTurnoById(turnoId);
  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  const asociado = await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? turno.nutricionista_id
  );
  if (Number(turno.nutricionista_id) !== Number(asociado)) {
    throw new DomainError("No autorizado", 403);
  }

  if (turno.estado_turno_id === 3) {
    throw new DomainError("El turno ya se encuentra cancelado", 400);
  }

  await updateTurnoEstado(turnoId, 3);

  const mensaje = `Turno cancelado por el profesional. Motivo: ${
    motivo ?? "Sin detalle"
  }`;
  await notificarEventoTurno(turnoId, EventoTurno.CANCELADO, { mensaje });
};

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
  context: CreateTurnoContext
): Promise<{ calendarLink: string | null; icsContent: string | null }> => {
  if (context.userRol !== "paciente") {
    throw new DomainError("No autorizado", 403);
  }

  const turno = await findTurnoById(turnoId);
  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  await ensurePacientePropietarioByUser(context.userId, turno.paciente_id);

  const targetDate = new Date(nuevaFecha);
  if (Number.isNaN(targetDate.getTime())) {
    throw new DomainError("Fecha inválida", 400);
  }

  const diaSemana = targetDate
    .toLocaleDateString("es-ES", { weekday: "long" })
    .toLowerCase();

  const rangos = await findDisponibilidadByNutricionistaAndDia(
    turno.nutricionista_id,
    diaSemana
  );

  if (!rangos.length || !horaDentroDeRangos(nuevaHora, rangos)) {
    throw new DomainError(
      "El profesional no tiene disponibilidad en el horario indicado",
      400
    );
  }

  const ocupado = await existsTurnoActivoEnHorarioExcepto(
    turno.nutricionista_id,
    nuevaFecha,
    nuevaHora,
    turnoId
  );

  if (ocupado) {
    throw new DomainError("El horario solicitado ya está reservado", 409);
  }

  await updateTurnoFechaHoraYEstado(turnoId, nuevaFecha, nuevaHora, 2);

  await notificarEventoTurno(turnoId, EventoTurno.REPROGRAMADO, {
    mensaje: "Turno reprogramado por el paciente",
  });

  const turnoActualizado = await buildTurnoDominio(turnoId);
  return buildCalendarDataFromTurno(turnoActualizado);
};

export const reprogramarTurnoNutricionistaService = async (
  turnoId: number,
  nuevaFecha: string,
  nuevaHora: string,
  context: TurnoActionNutriContext
): Promise<void> => {
  const turno = await findTurnoById(turnoId);
  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  const asociado = await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? turno.nutricionista_id
  );
  if (Number(turno.nutricionista_id) !== Number(asociado)) {
    throw new DomainError("No autorizado", 403);
  }

  const targetDate = new Date(nuevaFecha);
  if (Number.isNaN(targetDate.getTime())) {
    throw new DomainError("Fecha inválida", 400);
  }

  const diaSemana = targetDate
    .toLocaleDateString("es-ES", { weekday: "long" })
    .toLowerCase();

  const rangos = await findDisponibilidadByNutricionistaAndDia(
    turno.nutricionista_id,
    diaSemana
  );

  if (!rangos.length || !horaDentroDeRangos(nuevaHora, rangos)) {
    throw new DomainError(
      "El profesional no tiene disponibilidad en el horario indicado",
      400
    );
  }

  const ocupado = await existsTurnoActivoEnHorarioExcepto(
    turno.nutricionista_id,
    nuevaFecha,
    nuevaHora,
    turnoId
  );

  if (ocupado) {
    throw new DomainError("El horario solicitado ya está reservado", 409);
  }

  await updateTurnoFechaHoraYEstado(turnoId, nuevaFecha, nuevaHora, 2);
  await notificarEventoTurno(turnoId, EventoTurno.REPROGRAMADO, {
    mensaje: "Turno reprogramado por el profesional",
  });
};
