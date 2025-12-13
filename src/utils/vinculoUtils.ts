import { pool } from "../config/db";
import {
  assertVinculoActivo,
  obtenerNutricionistaIdPorUsuario,
  obtenerPacienteIdPorUsuario,
} from "../repositories/vinculoRepository";
import { DomainError } from "../interfaces/errors";
import { ForbiddenError } from "./errorsUtils";

/**
 * Permite el acceso al perfil de un paciente a:
 *  - el propio paciente
 *  - un nutricionista vinculado
 *  - un admin
 */
export const verificarAccesoPaciente = async (
  req: { user?: { usuarioId: number; rol: string } },
  pacienteId: number
): Promise<void> => {
  if (!req.user) {
    throw new ForbiddenError("Usuario no autenticado");
  }

  const { usuarioId, rol } = req.user;

  if (rol === "admin") {
    return;
  }

  if (rol === "paciente") {
    await ensurePacientePropietario(usuarioId, pacienteId);
    return;
  }

  if (rol === "nutricionista") {
    const nutricionistaId = await obtenerNutricionistaIdPorUsuario(usuarioId);

    if (!nutricionistaId) {
      throw new ForbiddenError("Nutricionista no encontrado");
    }

    await assertVinculoActivo(pacienteId, nutricionistaId);
    return;
  }

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
