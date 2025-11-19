import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

interface RolRow extends RowDataPacket {
  rol_id: number;
}

export const findRolIdByNombre = async (
  client: Pool | PoolConnection,
  nombre: string
): Promise<number | null> => {
  const [rows] = await client.query<RolRow[]>(
    `SELECT rol_id FROM rol WHERE LOWER(nombre) = LOWER(?) LIMIT 1`,
    [nombre]
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].rol_id);
};
