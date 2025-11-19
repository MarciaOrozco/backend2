import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import type { TurnoExistente } from "../types/agenda";

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
