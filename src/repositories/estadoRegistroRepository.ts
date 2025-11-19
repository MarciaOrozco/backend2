import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

interface EstadoRegistroRow extends RowDataPacket {
  estado_registro_id: number;
}

export const findEstadoRegistroIdByNombre = async (
  client: Pool | PoolConnection,
  nombre: string
): Promise<number | null> => {
  const [rows] = await client.query<EstadoRegistroRow[]>(
    `SELECT estado_registro_id FROM estado_registro WHERE LOWER(nombre) = LOWER(?) LIMIT 1`,
    [nombre]
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].estado_registro_id);
};
