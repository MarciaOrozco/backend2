import type { CreateTurnoPayload, CreateTurnoResult } from "../types/turno";
import { DomainError } from "../types/errors";
import { createTurno as createTurnoRepository } from "../repositories/turnoRepository";
import {
  assertVinculoActivo,
  ensureNutricionistaPropietario,
  ensurePacientePropietario,
} from "../utils/vinculoUtils";
import { vincularPacienteProfesional } from "./vinculacionService";

interface CreateTurnoContext {
  userRol: string;
  userId: number;
}

/**
 * Función interna que encapsula solo la creación de la fila en BD.
 * Reemplaza al viejo `crearTurnoInterno` del controller.
 */
export const crearTurnoInterno = async (
  payload: CreateTurnoPayload
): Promise<number> => {
  const turnoId = await createTurnoRepository(undefined, payload);
  return turnoId;
};

/**
 * Caso de uso completo: crear un turno desde una petición HTTP.
 * Valida rol, propietario, vínculo y dispara notificaciones.
 */
export const createTurno = async (
  payload: CreateTurnoPayload,
  context: CreateTurnoContext
): Promise<CreateTurnoResult> => {
  const { userRol, userId } = context;
  let pacienteIdValue = payload.pacienteId;

  if (userRol === "paciente") {
    const pacienteAsociado = await ensurePacientePropietario(
      userId,
      pacienteIdValue
    );
    pacienteIdValue = pacienteAsociado;
  } else if (userRol === "nutricionista") {
    await ensureNutricionistaPropietario(userId, payload.nutricionistaId);
    await assertVinculoActivo(pacienteIdValue, payload.nutricionistaId);
  } else {
    throw new DomainError("No autorizado", 403);
  }

  const turnoId = await crearTurnoInterno({
    ...payload,
    pacienteId: pacienteIdValue,
  });

  //   await notificarTurnoConfirmado(turnoId);
  await vincularPacienteProfesional(turnoId);

  return { turnoId };
};
