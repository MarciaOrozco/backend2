import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "../config/db";
import type { TurnoExistente } from "../types/agenda";
import { CreateTurnoPayload } from "../types/turno";

interface TurnoExistenteRow extends RowDataPacket {
  hora: string;
}

interface TurnoPacienteRow extends RowDataPacket {
  turno_id: number;
  fecha: Date | string;
  hora: string | null;
  estado_turno_id: number;
  estado: string;
  modalidad_id: number | null;
  modalidad: string | null;
  nutricionista_id: number;
  nutricionista_nombre: string;
  nutricionista_apellido: string;
}

interface TurnoNutricionistaRow extends RowDataPacket {
  turno_id: number;
  fecha: Date | string;
  hora: string | null;
  estado_turno_id: number;
  estado: string;
  modalidad_id: number | null;
  modalidad: string | null;
  paciente_id: number;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
  paciente_email: string | null;
}

interface TurnoVinculoRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}

interface TurnoRow extends RowDataPacket {
  turno_id: number;
  paciente_id: number;
  nutricionista_id: number;
  fecha: Date | string;
  hora: string | null;
  estado_turno_id: number;
}

interface TurnoDetalleRow extends RowDataPacket {
  turno_id: number;
  paciente_id: number;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
  paciente_email: string | null;
  nutricionista_id: number;
  nutricionista_nombre: string | null;
  nutricionista_apellido: string | null;
  nutricionista_email: string | null;
  fecha: Date | string;
  hora: string | null;
  estado_turno_id: number;
  modalidad_id: number | null;
  metodo_pago_id: number | null;
}

/**
 * Turnos activos (estado 1 ó 2) de un nutricionista en una fecha dada.
 * Usado para generación de slots.
 */
export const findTurnosActivosByNutricionistaAndFecha = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number,
  fecha: string
): Promise<TurnoExistente[]> => {
  const [rows] = await client.query<TurnoExistenteRow[]>(
    `
      SELECT hora
      FROM turno
      WHERE nutricionista_id = ?
        AND fecha = ?
        AND estado_turno_id IN (1, 2)
    `,
    [nutricionistaId, fecha]
  );

  return rows;
};

/**
 * Crear un turno nuevo.
 * Nota: el estado inicial lo fijamos a 1 (por ejemplo “pendiente”),
 * pero si querés que arranque como confirmado podés cambiarlo a 2.
 */
export const createTurno = async (
  client: Pool | PoolConnection = pool,
  payload: CreateTurnoPayload
): Promise<number> => {
  const [result] = await client.query<ResultSetHeader>(
    `
      INSERT INTO turno (
        fecha,
        hora,
        paciente_id,
        nutricionista_id,
        modalidad_id,
        metodo_pago_id,
        estado_turno_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.fecha,
      payload.hora,
      payload.pacienteId,
      payload.nutricionistaId,
      payload.modalidadId ?? null,
      payload.metodoPagoId ?? null,
      1, // o 2 si tu lógica de negocio lo requiere
    ]
  );

  return Number(result.insertId);
};

/** Obtener paciente y nutricionista a partir de un turno */
export const findPacienteYNutricionistaByTurnoId = async (
  turnoId: number
): Promise<{ pacienteId: number; nutricionistaId: number } | null> => {
  const [rows] = await pool.query<TurnoVinculoRow[]>(
    `
      SELECT paciente_id, nutricionista_id
      FROM turno
      WHERE turno_id = ?
    `,
    [turnoId]
  );

  if (!rows.length) return null;

  return {
    pacienteId: Number(rows[0].paciente_id),
    nutricionistaId: Number(rows[0].nutricionista_id),
  };
};

/** Listar turnos de un paciente con info del nutricionista */
export const findTurnosByPacienteId = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number
): Promise<TurnoPacienteRow[]> => {
  const [rows] = await client.query<TurnoPacienteRow[]>(
    `
      SELECT
        t.turno_id,
        t.fecha,
        t.hora,
        t.estado_turno_id,
        est.nombre AS estado,
        t.modalidad_id,
        m.nombre AS modalidad,
        n.nutricionista_id,
        u.nombre AS nutricionista_nombre,
        u.apellido AS nutricionista_apellido
      FROM turno t
      JOIN estado_turno est ON t.estado_turno_id = est.estado_turno_id
      JOIN nutricionista n ON t.nutricionista_id = n.nutricionista_id
      JOIN usuario u ON n.usuario_id = u.usuario_id
      LEFT JOIN modalidad m ON t.modalidad_id = m.modalidad_id
      WHERE t.paciente_id = ?
      ORDER BY t.fecha ASC, t.hora ASC
    `,
    [pacienteId]
  );

  return rows;
};

/** Turnos activos (1,2) de un nutricionista con datos de paciente */
export const findTurnosActivosByNutricionista = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number
): Promise<TurnoNutricionistaRow[]> => {
  const [rows] = await client.query<TurnoNutricionistaRow[]>(
    `
      SELECT
        t.turno_id,
        t.fecha,
        t.hora,
        t.estado_turno_id,
        est.nombre AS estado,
        t.modalidad_id,
        m.nombre AS modalidad,
        p.paciente_id,
        u.nombre AS paciente_nombre,
        u.apellido AS paciente_apellido,
        u.email AS paciente_email
      FROM turno t
      JOIN estado_turno est ON t.estado_turno_id = est.estado_turno_id
      JOIN paciente p ON t.paciente_id = p.paciente_id
      JOIN usuario u ON p.usuario_id = u.usuario_id
      LEFT JOIN modalidad m ON t.modalidad_id = m.modalidad_id
      WHERE t.nutricionista_id = ?
        AND t.estado_turno_id IN (1, 2)
      ORDER BY t.fecha ASC, t.hora ASC
    `,
    [nutricionistaId]
  );

  return rows;
};

/* ──────────────────────────────────────────────
 * MÉTODOS NUEVOS PARA CANCELAR / REPROGRAMAR
 * ────────────────────────────────────────────── */

/** Obtener un turno completo por id */
export const findTurnoById = async (
  client: Pool | PoolConnection = pool,
  turnoId: number
): Promise<TurnoRow | null> => {
  const [rows] = await client.query<TurnoRow[]>(
    `
      SELECT
        turno_id,
        paciente_id,
        nutricionista_id,
        fecha,
        hora,
        estado_turno_id,
        modalidad_id,
        metodo_pago_id
      FROM turno
      WHERE turno_id = ?
      LIMIT 1
    `,
    [turnoId]
  );

  return rows.length ? rows[0] : null;
};

export const findTurnoDetalleById = async (
  client: Pool | PoolConnection = pool,
  turnoId: number
): Promise<TurnoDetalleRow | null> => {
  const [rows] = await client.query<TurnoDetalleRow[]>(
    `
      SELECT
        t.turno_id,
        t.paciente_id,
        u_p.nombre AS paciente_nombre,
        u_p.apellido AS paciente_apellido,
        u_p.email AS paciente_email,
        t.nutricionista_id,
        u_n.nombre AS nutricionista_nombre,
        u_n.apellido AS nutricionista_apellido,
        u_n.email AS nutricionista_email,
        t.fecha,
        t.hora,
        t.estado_turno_id,
        t.modalidad_id,
        t.metodo_pago_id
      FROM turno t
      JOIN paciente p ON t.paciente_id = p.paciente_id
      JOIN usuario u_p ON p.usuario_id = u_p.usuario_id
      JOIN nutricionista n ON t.nutricionista_id = n.nutricionista_id
      JOIN usuario u_n ON n.usuario_id = u_n.usuario_id
      WHERE t.turno_id = ?
      LIMIT 1
    `,
    [turnoId]
  );

  return rows.length ? rows[0] : null;
};

/** Actualizar solo el estado del turno (por ejemplo, cancelar = 3) */
export const updateTurnoEstado = async (
  client: Pool | PoolConnection = pool,
  turnoId: number,
  nuevoEstadoId: number
): Promise<void> => {
  await client.query(
    `
      UPDATE turno
      SET estado_turno_id = ?
      WHERE turno_id = ?
    `,
    [nuevoEstadoId, turnoId]
  );
};

/** Reprogramar fecha y hora y dejar el turno como activo/confirmado */
export const updateTurnoFechaYHora = async (
  client: Pool | PoolConnection = pool,
  turnoId: number,
  nuevaFecha: string,
  nuevaHora: string,
  nuevoEstadoId: number = 2
): Promise<void> => {
  await client.query(
    `
      UPDATE turno
      SET fecha = ?, hora = ?, estado_turno_id = ?
      WHERE turno_id = ?
    `,
    [nuevaFecha, nuevaHora, nuevoEstadoId, turnoId]
  );
};

/** Registrar mensajes en log_eventos */
export const insertTurnoLogEvento = async (
  client: Pool | PoolConnection = pool,
  turnoId: number,
  mensaje: string
): Promise<void> => {
  await client.query(
    `
      INSERT INTO log_eventos (turno_id, mensaje)
      VALUES (?, ?)
    `,
    [turnoId, mensaje]
  );
};

export const existsTurnoActivoEnHorarioExcepto = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number,
  fecha: string,
  hora: string,
  turnoIdExcluir: number
): Promise<boolean> => {
  const [rows] = await client.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM turno
      WHERE nutricionista_id = ?
        AND fecha = ?
        AND hora = ?
        AND turno_id <> ?
        AND estado_turno_id IN (1, 2)
      LIMIT 1
    `,
    [nutricionistaId, fecha, hora, turnoIdExcluir]
  );

  return rows.length > 0;
};

export const updateTurnoFechaHoraYEstado = async (
  client: Pool | PoolConnection = pool,
  turnoId: number,
  fecha: string,
  hora: string,
  estadoTurnoId: number
): Promise<void> => {
  await client.query(
    `
      UPDATE turno
      SET fecha = ?, hora = ?, estado_turno_id = ?
      WHERE turno_id = ?
    `,
    [fecha, hora, estadoTurnoId, turnoId]
  );
};
