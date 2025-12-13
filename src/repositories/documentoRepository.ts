import type { Pool, PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";
import { InsertDocumentoParams } from "../interfaces/documento";

export const insertDocumento = async (
  client: Pool | PoolConnection = pool,
  params: InsertDocumentoParams
): Promise<void> => {
  const {
    pacienteId,
    descripcion,
    rutaArchivo,
    fecha,
    consultaId = null,
  } = params;

  await client.query(
    `
      INSERT INTO documento (paciente_id, consulta_id, descripcion, ruta_archivo, fecha)
      VALUES (?, ?, ?, ?, ?)
    `,
    [pacienteId, consultaId, descripcion, rutaArchivo, fecha]
  );
};
