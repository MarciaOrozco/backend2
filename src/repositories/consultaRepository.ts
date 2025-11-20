import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";

export interface ConsultaListadoRow extends RowDataPacket {
  consulta_id: number;
  fecha_consulta: Date | string | null;
  estado: string;
  resumen: string | null;
  nutricionista_id: number;
}

export const findConsultasByPaciente = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number,
  nutricionistaId?: number
): Promise<ConsultaListadoRow[]> => {
  let query = `
    SELECT
      consulta_id,
      fecha_consulta,
      estado,
      resumen,
      nutricionista_id
    FROM consulta
    WHERE paciente_id = ?
  `;

  const params: Array<number> = [pacienteId];

  if (nutricionistaId !== undefined) {
    query += " AND nutricionista_id = ?";
    params.push(nutricionistaId);
  }

  query += " ORDER BY fecha_consulta DESC, consulta_id DESC";

  const [rows] = await client.query<ConsultaListadoRow[]>(query, params);
  return rows;
};
