import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import { findRolIdByNombre } from "./rolRepository";
import { findEstadoRegistroIdByNombre } from "./estadoRegistroRepository";
import { findUsuarioByEmail } from "./usuarioRepository";
import { DomainError } from "../types/errors";
import {
  existsRelacionPacienteProfesional,
  insertRelacionPacienteProfesional,
} from "./vinculoRepository";
import { insertConsulta } from "./consultaRepository";

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
interface CrearPacienteManualData {
  nombre: string;
  apellido: string;
  email: string;
  tokenInvitacion: string;
  fechaExpiracion: Date;
  nutricionistaId: number;
}

interface CrearPacienteManualResult {
  pacienteId: number;
  usuarioId: number;
  consultaTemporalId: number;
}

export const crearPacienteManual = async (
  data: CrearPacienteManualData
): Promise<CrearPacienteManualResult> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Obtener IDs
    const rolPacienteId = await findRolIdByNombre(connection, "paciente");
    const estadoPendienteId = await findEstadoRegistroIdByNombre(
      connection,
      "pendiente"
    );

    // 2. Verificar si usuario existe
    const usuarioExistente = await findUsuarioByEmail(connection, data.email);

    let usuarioId: number;

    if (usuarioExistente) {
      usuarioId = Number(usuarioExistente.usuario_id);

      // Si no es paciente, actualiza el rol
      if (
        usuarioExistente.rol_id == null ||
        Number(usuarioExistente.rol_id) !== rolPacienteId
      ) {
        await connection.query(
          `UPDATE usuario SET rol_id = ? WHERE usuario_id = ?`,
          [rolPacienteId, usuarioId]
        );
      }

      // Actualizar nombre y apellido
      await connection.query(
        `UPDATE usuario SET nombre = ?, apellido = ? WHERE usuario_id = ?`,
        [data.nombre, data.apellido, usuarioId]
      );
    } else {
      // Crear nuevo usuario
      const [result]: any = await connection.query(
        `
          INSERT INTO usuario (nombre, apellido, email, password, telefono, fecha_registro, rol_id)
          VALUES (?, ?, ?, ?, NULL, NOW(), ?)
        `,
        [data.nombre, data.apellido, data.email, "", rolPacienteId]
      );
      usuarioId = Number(result.insertId);
    }

    // 3. Buscar o crear paciente
    const [pacRows]: any = await connection.query(
      `
        SELECT p.paciente_id, er.nombre AS estado_registro
        FROM paciente p
        LEFT JOIN estado_registro er ON p.estado_registro_id = er.estado_registro_id
        WHERE p.usuario_id = ?
        LIMIT 1
      `,
      [usuarioId]
    );

    let pacienteId: number;

    if (pacRows.length) {
      const estadoActual = pacRows[0].estado_registro
        ? String(pacRows[0].estado_registro).toLowerCase()
        : null;

      if (estadoActual && estadoActual !== "pendiente") {
        throw new DomainError("Paciente ya registrado", 409);
      }

      pacienteId = Number(pacRows[0].paciente_id);

      // Actualizar paciente existente
      await connection.query(
        `
          UPDATE paciente
          SET
            estado_registro_id = ?,
            fecha_invitacion = NOW(),
            fecha_expiracion = ?,
            token_invitacion = ?,
            usuario_id = ?
          WHERE paciente_id = ?
        `,
        [
          estadoPendienteId,
          data.fechaExpiracion,
          data.tokenInvitacion,
          usuarioId,
          pacienteId,
        ]
      );
    } else {
      // Crear nuevo paciente
      const [pacienteResult]: any = await connection.query(
        `
          INSERT INTO paciente (
            usuario_id,
            estado_registro_id,
            fecha_invitacion,
            fecha_expiracion,
            token_invitacion
          )
          VALUES (?, ?, NOW(), ?, ?)
        `,
        [
          usuarioId,
          estadoPendienteId,
          data.fechaExpiracion,
          data.tokenInvitacion,
        ]
      );

      pacienteId = Number(pacienteResult.insertId);
    }

    // 4. Crear relación paciente-profesional si no existe
    const existeRelacion = await existsRelacionPacienteProfesional(
      connection,
      pacienteId,
      data.nutricionistaId
    );

    if (!existeRelacion) {
      await insertRelacionPacienteProfesional(
        connection,
        pacienteId,
        data.nutricionistaId
      );
    }

    // 5. Crear consulta temporal en borrador
    const consultaTemporalId = await insertConsulta(
      connection,
      pacienteId,
      data.nutricionistaId
    );

    await connection.commit();

    return {
      pacienteId,
      usuarioId,
      consultaTemporalId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
