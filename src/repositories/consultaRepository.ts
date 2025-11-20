import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "../config/db";

/* --- Listado de consultas (para página de consultas del paciente) --- */
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

/* --- Consulta por id (detalle/edición) --- */
export interface ConsultaRow extends RowDataPacket {
  consulta_id: number;
  paciente_id: number;
  nutricionista_id: number;
  fecha_consulta: Date | string | null;
  estado: string;
  motivo: string | null;
  antecedentes: string | null;
  objetivos: string | null;
  peso: number | null;
  altura: number | null;
  imc: number | null;
  cintura: number | null;
  cadera: number | null;
  porcentaje_grasa: number | null;
  porcentaje_magra: number | null;
  meta_peso: number | null;
  meta_semanal: number | null;
  observaciones_medidas: string | null;
  resumen: string | null;
  diagnostico: string | null;
  indicaciones: string | null;
  observaciones_internas: string | null;
  visibilidad_notas: string | null;
}

export const findConsultaById = async (
  client: Pool | PoolConnection = pool,
  consultaId: number
): Promise<ConsultaRow | null> => {
  const [rows] = await client.query<ConsultaRow[]>(
    `SELECT * FROM consulta WHERE consulta_id = ? LIMIT 1`,
    [consultaId]
  );

  return rows[0] ?? null;
};

export const insertConsulta = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number,
  nutricionistaId: number
): Promise<number> => {
  const [result] = await client.query<ResultSetHeader>(
    `
      INSERT INTO consulta (
        paciente_id,
        nutricionista_id,
        fecha_consulta,
        estado,
        fecha_creacion,
        fecha_actualizacion
      ) VALUES (?, ?, CURRENT_DATE, 'borrador', NOW(), NOW())
    `,
    [pacienteId, nutricionistaId]
  );

  return Number(result.insertId);
};

export const updateConsultaById = async (
  client: Pool | PoolConnection = pool,
  consultaId: number,
  payload: Record<string, any>
): Promise<void> => {
  await client.query(
    `UPDATE consulta SET ?, fecha_actualizacion = NOW() WHERE consulta_id = ?`,
    [payload, consultaId]
  );
};

export const deleteConsultaById = async (
  client: Pool | PoolConnection = pool,
  consultaId: number
): Promise<void> => {
  await client.query(`DELETE FROM consulta WHERE consulta_id = ?`, [
    consultaId,
  ]);
};

/* --- Evolución del paciente (gráficos, informes) --- */
export interface ConsultaEvolucionRow extends RowDataPacket {
  fecha_consulta: Date | string | null;
  peso: number | null;
  imc: number | null;
  cintura: number | null;
  porcentaje_grasa: number | null;
  meta_peso: number | null;
}

export const findEvolucionByPacienteId = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number
): Promise<ConsultaEvolucionRow[]> => {
  const [rows] = await client.query<ConsultaEvolucionRow[]>(
    `
      SELECT
        fecha_consulta,
        peso,
        imc,
        cintura,
        porcentaje_grasa,
        meta_peso
      FROM consulta
      WHERE paciente_id = ?
      ORDER BY fecha_consulta ASC, consulta_id ASC
    `,
    [pacienteId]
  );

  return rows;
};

/* --- Documentos asociados a la consulta --- */
export interface DocumentoConsultaRow extends RowDataPacket {
  documento_id: number;
  descripcion: string | null;
  ruta_archivo: string;
  fecha: Date | string | null;
}

export const findDocumentosByConsultaId = async (
  client: Pool | PoolConnection = pool,
  consultaId: number
): Promise<DocumentoConsultaRow[]> => {
  const [rows] = await client.query<DocumentoConsultaRow[]>(
    `
      SELECT documento_id, descripcion, ruta_archivo, fecha
      FROM documento
      WHERE consulta_id = ?
      ORDER BY fecha DESC, documento_id DESC
    `,
    [consultaId]
  );

  return rows;
};

export const insertDocumentoConsulta = async (
  client: Pool | PoolConnection = pool,
  params: {
    pacienteId: number;
    consultaId: number;
    descripcion: string;
    rutaArchivo: string;
    fecha: string;
  }
): Promise<void> => {
  const { pacienteId, consultaId, descripcion, rutaArchivo, fecha } = params;

  await client.query(
    `
      INSERT INTO documento (paciente_id, consulta_id, descripcion, ruta_archivo, fecha)
      VALUES (?, ?, ?, ?, ?)
    `,
    [pacienteId, consultaId, descripcion, rutaArchivo, fecha]
  );
};

export interface HistorialPesoRow extends RowDataPacket {
  fecha: Date | string | null;
  peso: number | null;
}

export const findHistorialPeso = async (
  client: Pool | PoolConnection = pool,
  pacienteId: number,
  nutricionistaId: number
): Promise<HistorialPesoRow[]> => {
  const [rows] = await client.query<HistorialPesoRow[]>(
    `
      SELECT fecha_consulta AS fecha, peso
      FROM consulta
      WHERE paciente_id = ? AND nutricionista_id = ?
      ORDER BY fecha_consulta ASC
    `,
    [pacienteId, nutricionistaId]
  );

  return rows;
};
