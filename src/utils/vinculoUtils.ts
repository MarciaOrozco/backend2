import { pool } from "../config/db";
import { DomainError } from "../types/errors";
import {
  obtenerNutricionistaIdPorUsuario,
  obtenerPacienteIdPorUsuario,
} from "./pacienteUtils";

export class ForbiddenError extends Error {
  status = 403;

  constructor(message = "No autorizado para operar con este paciente") {
    super(message);
  }
}

/**
 * Verifica que exista una relación activa entre paciente y nutricionista.
 * Lanza ForbiddenError si no hay vínculo.
 */
export const assertVinculoActivo = async (
  pacienteId: number,
  nutricionistaId: number
) => {
  const [rows]: any = await pool.query(
    `SELECT 1
     FROM relacion_paciente_profesional
     WHERE paciente_id = ? AND nutricionista_id = ?
     LIMIT 1`,
    [pacienteId, nutricionistaId]
  );

  if (!rows.length) {
    throw new ForbiddenError();
  }
};

/**
 * Permite el acceso al perfil de un paciente a:
 *  - el propio paciente
 *  - un nutricionista vinculado
 *  - un admin
 */
export const verificarAccesoPaciente = async (req: any, pacienteId: number) => {
  if (!req.user) throw new ForbiddenError("Usuario no autenticado");

  const { usuarioId, rol } = req.user;

  // 👤 Paciente accediendo a su propio perfil
  if (rol === "paciente") {
    const asociado = await obtenerPacienteIdPorUsuario(usuarioId);
    if (!asociado || Number(asociado) !== Number(pacienteId)) {
      throw new ForbiddenError("No autorizado para acceder a este paciente");
    }
    return;
  }

  // 🩺 Nutricionista vinculado
  if (rol === "nutricionista") {
    const [nutriRows]: any = await pool.query(
      `SELECT nutricionista_id FROM nutricionista WHERE usuario_id = ?`,
      [usuarioId]
    );
    const nutricionistaId = nutriRows?.[0]?.nutricionista_id;
    if (!nutricionistaId)
      throw new ForbiddenError("Nutricionista no encontrado");

    await assertVinculoActivo(pacienteId, nutricionistaId);
    return;
  }

  // 🛡️ Admin
  if (rol === "admin") return;

  throw new ForbiddenError("Rol no autorizado");
};

export const ensurePacientePropietario = async (
  usuarioId: number,
  pacienteId?: number
): Promise<number> => {
  const asociado = await obtenerPacienteIdPorUsuario(usuarioId);

  if (!asociado) {
    throw new DomainError("El usuario no está vinculado a un paciente", 403);
  }

  if (pacienteId != null && Number(pacienteId) !== Number(asociado)) {
    throw new DomainError("No tienes permisos sobre este paciente", 403);
  }

  return asociado;
};

export const ensureNutricionistaPropietario = async (
  usuarioId: number,
  nutricionistaId?: number
): Promise<number> => {
  const asociado = await obtenerNutricionistaIdPorUsuario(usuarioId);

  if (!asociado) {
    throw new DomainError(
      "El usuario no está vinculado a un nutricionista",
      403
    );
  }

  if (nutricionistaId != null && Number(nutricionistaId) !== Number(asociado)) {
    throw new DomainError("No tienes permisos sobre este recurso", 403);
  }

  return asociado;
};
