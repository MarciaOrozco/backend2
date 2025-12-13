import { DomainError } from "../interfaces/errors";
import {
  existsRelacionPacienteProfesional,
  insertRelacionPacienteProfesional,
  obtenerPacienteIdPorUsuario,
} from "../repositories/vinculoRepository";
import { findPacienteYNutricionistaByTurnoId } from "../repositories/turnoRepository";
import {
  CrearVinculacionContext,
  CrearVinculacionPayload,
} from "../interfaces/paciente";

/**
 * Caso de uso: crear vinculación manual paciente ↔ nutricionista.
 */
export const crearVinculacionManual = async (
  payload: CrearVinculacionPayload,
  context: CrearVinculacionContext
): Promise<{ yaExistia: boolean }> => {
  const { nutricionistaId } = payload;
  let pacienteId = payload.pacienteId;

  if (!nutricionistaId) {
    throw new DomainError("nutricionistaId es obligatorio", 400);
  }

  // Si hay usuario autenticado, debe ser paciente y se usa su pacienteId asociado
  if (context.usuarioId) {
    const asociado = await obtenerPacienteIdPorUsuario(context.usuarioId);
    if (!asociado) {
      throw new DomainError("El usuario no es paciente", 403);
    }
    pacienteId = asociado;
  }

  if (!pacienteId) {
    throw new DomainError("pacienteId es obligatorio", 400);
  }

  const existe = await existsRelacionPacienteProfesional(
    undefined,
    pacienteId,
    nutricionistaId
  );

  if (existe) {
    return { yaExistia: true };
  }

  await insertRelacionPacienteProfesional(
    undefined,
    pacienteId,
    nutricionistaId
  );

  return { yaExistia: false };
};

/**
 * Caso de uso: vincular automáticamente paciente ↔ profesional a partir de un turno.
 * Este reemplaza a la función vincularPacienteProfesional del controller viejo.
 */
export const vincularPacienteProfesional = async (turnoId: number) => {
  const turno = await findPacienteYNutricionistaByTurnoId(turnoId);

  if (!turno) {
    throw new DomainError("Turno no encontrado", 404);
  }

  const { pacienteId, nutricionistaId } = turno;

  const existe = await existsRelacionPacienteProfesional(
    undefined,
    pacienteId,
    nutricionistaId
  );

  if (existe) {
    return { success: true, mensaje: "Ya vinculado" };
  }

  await insertRelacionPacienteProfesional(
    undefined,
    pacienteId,
    nutricionistaId
  );

  return { success: true, mensaje: "Vínculo creado" };
};
