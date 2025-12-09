import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import type { RangoDisponibilidad } from "../types/agenda";

interface RangoDisponibilidadRow extends RowDataPacket {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos?: number | null;
}

export const findDisponibilidadByNutricionistaAndDia = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number,
  dayName: string
): Promise<RangoDisponibilidad[]> => {
  const params = [nutricionistaId, dayName.toLowerCase()];
  try {
    const [rows] = await client.query<RangoDisponibilidadRow[]>(
      `
        SELECT dia_semana, hora_inicio, hora_fin, intervalo_minutos
        FROM disponibilidad
        WHERE nutricionista_id = ?
          AND LOWER(dia_semana) = ?
      `,
      params
    );
    return rows;
  } catch (error: any) {
    // Si la columna no existe aún, intentamos sin ella para compatibilidad.
    if (error?.code === "ER_BAD_FIELD_ERROR") {
      const [rows] = await client.query<RangoDisponibilidadRow[]>(
        `
          SELECT dia_semana, hora_inicio, hora_fin
          FROM disponibilidad
          WHERE nutricionista_id = ?
            AND LOWER(dia_semana) = ?
        `,
        params
      );
      return rows.map((row) => ({ ...row, intervalo_minutos: null }));
    }
    throw error;
  }
};

export const deleteDisponibilidadByNutricionista = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number
): Promise<void> => {
  await client.query(
    `
      DELETE FROM disponibilidad
      WHERE nutricionista_id = ?
    `,
    [nutricionistaId]
  );
};

export const insertDisponibilidad = async (
  client: Pool | PoolConnection = pool,
  nutricionistaId: number,
  dia_semana: string,
  hora_inicio: string,
  hora_fin: string,
  intervalo_minutos: number | null
): Promise<void> => {
  try {
    await client.query(
      `
        INSERT INTO disponibilidad (nutricionista_id, dia_semana, hora_inicio, hora_fin, intervalo_minutos)
        VALUES (?, ?, ?, ?, ?)
      `,
      [nutricionistaId, dia_semana, hora_inicio, hora_fin, intervalo_minutos]
    );
  } catch (error: any) {
    if (error?.code === "ER_BAD_FIELD_ERROR") {
      await client.query(
        `
          INSERT INTO disponibilidad (nutricionista_id, dia_semana, hora_inicio, hora_fin)
          VALUES (?, ?, ?, ?)
        `,
        [nutricionistaId, dia_semana, hora_inicio, hora_fin]
      );
      return;
    }
    throw error;
  }
};
