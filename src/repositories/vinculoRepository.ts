import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";

interface RelacionPacienteProfesionalRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}

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
