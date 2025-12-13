import type { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";
import {
  CreateUsuarioPayload,
  UpdateUsuarioAuthPayload,
  UsuarioAuthRow,
  UsuarioProfileRow,
} from "../interfaces/usuario";

export const findUsuarioByEmail = async (
  client: Pool | PoolConnection,
  email: string
): Promise<UsuarioAuthRow | null> => {
  const [rows] = await client.query<UsuarioAuthRow[]>(
    `
      SELECT
        u.usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.password,
        u.telefono,
        u.rol_id,
        r.nombre AS rol
      FROM usuario u
      LEFT JOIN rol r ON u.rol_id = r.rol_id
      WHERE LOWER(u.email) = ?
      LIMIT 1
    `,
    [email]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
};

export const getUsuarioProfileById = async (
  client: Pool | PoolConnection,
  usuarioId: number
): Promise<UsuarioProfileRow | null> => {
  const [rows] = await client.query<UsuarioProfileRow[]>(
    `
      SELECT
        u.usuario_id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.rol_id,
        r.nombre AS rol,
        p.paciente_id,
        n.nutricionista_id
      FROM usuario u
      LEFT JOIN rol r ON u.rol_id = r.rol_id
      LEFT JOIN paciente p ON u.usuario_id = p.usuario_id
      LEFT JOIN nutricionista n ON u.usuario_id = n.usuario_id
      WHERE u.usuario_id = ?
      LIMIT 1
    `,
    [usuarioId]
  );

  if (!rows.length) {
    return null;
  }

  return rows[0];
};

export const updateUsuarioRol = async (
  connection: PoolConnection,
  usuarioId: number,
  rolId: number
) => {
  await connection.query(`UPDATE usuario SET rol_id = ? WHERE usuario_id = ?`, [
    rolId,
    usuarioId,
  ]);
};

export const updateUsuarioDatos = async (
  connection: PoolConnection,
  payload: UpdateUsuarioAuthPayload
) => {
  await connection.query(
    `
      UPDATE usuario
      SET nombre = ?, apellido = ?, password = ?, telefono = ?, fecha_registro = COALESCE(fecha_registro, NOW())
      WHERE usuario_id = ?
    `,
    [
      payload.nombre,
      payload.apellido,
      payload.password,
      payload.telefono ?? null,
      payload.usuarioId,
    ]
  );
};

export const createUsuario = async (
  connection: PoolConnection,
  payload: CreateUsuarioPayload
): Promise<number> => {
  const [result] = await connection.query<ResultSetHeader>(
    `
      INSERT INTO usuario (nombre, apellido, email, password, telefono, fecha_registro, rol_id)
      VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `,
    [
      payload.nombre,
      payload.apellido,
      payload.email,
      payload.password,
      payload.telefono ?? null,
      payload.rolId,
    ]
  );

  return Number(result.insertId);
};
