import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

interface PacienteRegistroRow extends RowDataPacket {
  paciente_id: number;
  usuario_id: number | null;
  token_invitacion: string | null;
  fecha_expiracion: Date | string | null;
  estado_registro: string | null;
}

export const findPacientePendiente = async (
  connection: PoolConnection,
  usuarioId: number,
  token?: string | null
): Promise<PacienteRegistroRow | null> => {
  const [rows] = await connection.query<PacienteRegistroRow[]>(
    `
      SELECT
        p.paciente_id,
        p.usuario_id,
        p.token_invitacion,
        p.fecha_expiracion,
        er.nombre AS estado_registro
      FROM paciente p
      LEFT JOIN estado_registro er ON p.estado_registro_id = er.estado_registro_id
      WHERE (p.usuario_id = ? OR (p.usuario_id IS NULL AND p.token_invitacion = ?))
      LIMIT 1
    `,
    [usuarioId, token ?? null]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
};

export const linkPacienteToUsuario = async (
  connection: PoolConnection,
  pacienteId: number,
  usuarioId: number
) => {
  await connection.query(
    `UPDATE paciente SET usuario_id = ? WHERE paciente_id = ?`,
    [usuarioId, pacienteId]
  );
};

export const activatePaciente = async (
  connection: PoolConnection,
  pacienteId: number,
  estadoRegistroId: number
) => {
  await connection.query(
    `
      UPDATE paciente
      SET estado_registro_id = ?, fecha_expiracion = NULL, token_invitacion = NULL
      WHERE paciente_id = ?
    `,
    [estadoRegistroId, pacienteId]
  );
};

export const createPacienteForUsuario = async (
  connection: PoolConnection,
  usuarioId: number,
  estadoRegistroId: number
) => {
  await connection.query(
    `
      INSERT INTO paciente (usuario_id, estado_registro_id, fecha_invitacion, fecha_expiracion, token_invitacion)
      VALUES (?, ?, NOW(), NULL, NULL)
    `,
    [usuarioId, estadoRegistroId]
  );
};

interface PacienteContactoRow extends RowDataPacket {
  paciente_id: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  ciudad: string | null;
}

export const getPacienteContactoById = async (
  client: Pool | PoolConnection,
  pacienteId: number
): Promise<PacienteContactoRow | null> => {
  const [rows] = await client.query<PacienteContactoRow[]>(
    `
      SELECT p.paciente_id, u.nombre, u.apellido, u.email, u.telefono, NULL AS ciudad
      FROM paciente p
      JOIN usuario u ON p.usuario_id = u.usuario_id
      WHERE p.paciente_id = ?
      LIMIT 1
    `,
    [pacienteId]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
};

interface DocumentoPacienteRow extends RowDataPacket {
  documento_id: number;
  descripcion: string | null;
  ruta_archivo: string;
  fecha: Date | string | null;
}

export const getDocumentosByPaciente = async (
  client: Pool | PoolConnection,
  pacienteId: number
): Promise<DocumentoPacienteRow[]> => {
  const [rows] = await client.query<DocumentoPacienteRow[]>(
    `
      SELECT documento_id, descripcion, ruta_archivo, fecha
      FROM documento
      WHERE paciente_id = ?
      ORDER BY fecha DESC, documento_id DESC
    `,
    [pacienteId]
  );

  return rows;
};

interface PlanPacienteRow extends RowDataPacket {
  plan_id: number;
  fecha_creacion: Date | string;
  ultima_actualizacion: Date | string | null;
  fecha_validacion: Date | string | null;
  estado: string | null;
  origen: string | null;
  titulo: string | null;
  notas: string | null;
}

export const getPlanesByPaciente = async (
  client: Pool | PoolConnection,
  pacienteId: number
): Promise<PlanPacienteRow[]> => {
  const [rows] = await client.query<PlanPacienteRow[]>(
    `
      SELECT
        plan_id,
        fecha_creacion,
        ultima_actualizacion,
        fecha_validacion,
        estado,
        origen,
        titulo,
        notas
      FROM plan_alimentario
      WHERE paciente_id = ?
      ORDER BY fecha_creacion DESC, plan_id DESC
    `,
    [pacienteId]
  );

  return rows;
};
