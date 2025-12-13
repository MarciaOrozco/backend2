import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import { RelacionPacienteProfesionalRow } from "../interfaces/vinculo";
import { ForbiddenError } from "../utils/errorsUtils";

export const existsRelacionPacienteProfesional = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number,
  nutricionistaId: number
): Promise<boolean> => {
  const [rows] = await client.query<RelacionPacienteProfesionalRow[]>(
    `
      SELECT 1
      FROM relacion_paciente_profesional
      WHERE paciente_id = ? AND nutricionista_id = ?
      LIMIT 1
    `,
    [pacienteId, nutricionistaId]
  );

  return rows.length > 0;
};

export const insertRelacionPacienteProfesional = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number,
  nutricionistaId: number
): Promise<void> => {
  await client.query(
    `
      INSERT INTO relacion_paciente_profesional (paciente_id, nutricionista_id)
      VALUES (?, ?)
    `,
    [pacienteId, nutricionistaId]
  );
};

/**
 * Verifica que exista una relación activa entre paciente y nutricionista.
 * Lanza ForbiddenError si no hay vínculo.
 */
export const assertVinculoActivo = async (
  pacienteId: number,
  nutricionistaId: number
) => {
  const [rows]: any = await pool.query(
    `SELECT 1
     FROM relacion_paciente_profesional
     WHERE paciente_id = ? AND nutricionista_id = ?
     LIMIT 1`,
    [pacienteId, nutricionistaId]
  );

  if (!rows.length) {
    throw new ForbiddenError();
  }
};

export const obtenerPacienteIdPorUsuario = async (usuarioId: number) => {
  const [rows]: any = await pool.query(
    `SELECT paciente_id FROM paciente WHERE usuario_id = ? LIMIT 1`,
    [usuarioId]
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].paciente_id);
};

export const obtenerNutricionistaIdPorUsuario = async (usuarioId: number) => {
  const [rows]: any = await pool.query(
    `SELECT nutricionista_id FROM nutricionista WHERE usuario_id = ? LIMIT 1`,
    [usuarioId]
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].nutricionista_id);
};
