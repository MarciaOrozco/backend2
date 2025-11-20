import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/db";

import { DomainError } from "../types/errors";
import { comparePassword, hashPassword } from "../utils/passwordUtils";
import { normalizeEmail, normalizeText } from "../utils/stringUtils";
import { RegistroPacienteExistente } from "./templateRegistroPaciente/RegistroPacienteExistente";
import { RegistroPacienteNuevo } from "./templateRegistroPaciente/RegistroPacienteNuevo";
import { RegisterPacienteTemplateData } from "../types/registerPacienteTemplateData";
import {
  AuthResponse,
  LoginPayload,
  RegisterPacientePayload,
  SesionInfo,
} from "../types/auth";
import { findRolIdByNombre } from "../repositories/rolRepository";
import { findEstadoRegistroIdByNombre } from "../repositories/estadoRegistroRepository";
import {
  findUsuarioByEmail,
  getUsuarioProfileById,
} from "../repositories/usuarioRepository";
import { generateAuthToken } from "../utils/tokenUtils";

const ensureConfigValue = async (
  getter: () => Promise<number | null>,
  errorMessage: string
): Promise<number> => {
  const value = await getter();
  if (!value) {
    throw new DomainError(errorMessage, 500);
  }
  return value;
};

const ensureTransaction = async <T>(
  handler: (connection: PoolConnection) => Promise<T>
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Error al revertir transacción:", rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const registerPaciente = async (
  payload: RegisterPacientePayload
): Promise<AuthResponse> => {
  const email = normalizeEmail(payload.email ?? null);
  const password = payload.password;

  if (!email || !password) {
    throw new DomainError("Email y contraseña son obligatorios", 400);
  }

  const nombreNormalizado = normalizeText(payload.nombre);
  const apellidoNormalizado = normalizeText(payload.apellido);
  const telefonoNormalizado = normalizeText(payload.telefono);
  const token = payload.token ?? null;

  const hashedPassword = await hashPassword(password);

  const templateData: RegisterPacienteTemplateData = {
    email,
    nombre: nombreNormalizado,
    apellido: apellidoNormalizado,
    telefono: telefonoNormalizado,
    token,
    hashedPassword,
  };

  const result = await ensureTransaction(async (connection) => {
    const rolPacienteId = await ensureConfigValue(
      () => findRolIdByNombre(connection, "paciente"),
      "Configuración incompleta para rol paciente"
    );
    const estadoActivoId = await ensureConfigValue(
      () => findEstadoRegistroIdByNombre(connection, "activo"),
      "Configuración incompleta para estado activo"
    );

    const usuario = await findUsuarioByEmail(connection, email);

    //  elegimos la implementación concreta,
    // pero el flujo general está definido en el Template Method (ejecutar).
    const template = usuario
      ? new RegistroPacienteExistente(
          connection,
          templateData,
          rolPacienteId,
          estadoActivoId,
          usuario
        )
      : new RegistroPacienteNuevo(
          connection,
          templateData,
          rolPacienteId,
          estadoActivoId
        );

    return template.ejecutar();
  });

  const tokenResult = generateAuthToken({
    usuarioId: result.usuarioId,
    rol: "paciente",
  });

  return {
    token: tokenResult,
    user: {
      usuarioId: result.usuarioId,
      rol: "paciente",
      nombre: result.nombre,
      apellido: result.apellido,
      email,
    },
  };
};

export const loginUsuario = async (
  payload: LoginPayload
): Promise<AuthResponse> => {
  const email = normalizeEmail(payload.email ?? null);
  const password = payload.password;

  if (!email || !password) {
    throw new DomainError("Email y contraseña son obligatorios", 400);
  }

  const usuario = await findUsuarioByEmail(pool, email);

  if (!usuario) {
    throw new DomainError("Credenciales inválidas", 401);
  }

  const validPassword = await comparePassword(password, usuario.password);

  if (!validPassword) {
    throw new DomainError("Credenciales inválidas", 401);
  }

  const rol = usuario.rol ?? "paciente";
  const token = generateAuthToken({ usuarioId: usuario.usuario_id, rol });

  return {
    token,
    user: {
      usuarioId: usuario.usuario_id,
      rol,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
    },
  };
};

export const obtenerSesion = async (usuarioId: number): Promise<SesionInfo> => {
  const profile = await getUsuarioProfileById(pool, usuarioId);

  if (!profile) {
    throw new DomainError("Usuario no encontrado", 404);
  }

  return {
    usuarioId: profile.usuario_id,
    rol: profile.rol ?? "paciente",
    nombre: profile.nombre ?? null,
    apellido: profile.apellido ?? null,
    email: profile.email,
    telefono: profile.telefono,
    pacienteId: profile.paciente_id ?? null,
    nutricionistaId: profile.nutricionista_id ?? null,
  };
};
