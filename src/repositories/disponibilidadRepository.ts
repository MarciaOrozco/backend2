import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import type { RangoDisponibilidad } from "../types/agenda";

interface RangoDisponibilidadRow extends RowDataPacket {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

export const findDisponibilidadByNutricionistaAndDia = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number,
  dayName: string
): Promise<RangoDisponibilidad[]> => {
  const [rows] = await client.query<RangoDisponibilidadRow[]>(
    `
      SELECT dia_semana, hora_inicio, hora_fin
      FROM disponibilidad
      WHERE nutricionista_id = ?
        AND LOWER(dia_semana) = ?
    `,
    [nutricionistaId, dayName.toLowerCase()]
  );

  return rows;
};
