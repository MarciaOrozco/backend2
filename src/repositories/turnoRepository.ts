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

interface TurnoVinculoRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}

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
