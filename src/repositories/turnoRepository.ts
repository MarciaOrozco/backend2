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

interface TurnoVinculoRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}

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
      1,
    ]
  );

  return Number(result.insertId);
};

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
