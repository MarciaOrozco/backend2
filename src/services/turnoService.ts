import type { CreateTurnoPayload, CreateTurnoResult } from "../types/turno";
import { DomainError } from "../types/errors";
import {
  createTurno as createTurnoRepository,
  findTurnosByPacienteId,
} from "../repositories/turnoRepository";
import {
  ensureNutricionistaPropietario,
  ensurePacientePropietario,
} from "../utils/vinculoUtils";
import { vincularPacienteProfesional } from "./vinculacionService";
import { assertVinculoActivo } from "../repositories/vinculoRepository";

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

const formatDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return String(value);
};

const mapTurnoPaciente = (row: any) => ({
  id: row.turno_id,
  fecha: formatDate(row.fecha),
  hora: row.hora ? row.hora.toString().slice(0, 5) : null,
  estado: row.estado,
  estadoId: row.estado_turno_id,
  modalidadId: row.modalidad_id,
  modalidad: row.modalidad,
  nutricionista: {
    id: row.nutricionista_id,
    nombre: row.nutricionista_nombre,
    apellido: row.nutricionista_apellido,
  },
});

export const obtenerTurnosPaciente = async (pacienteId: number) => {
  const rows = await findTurnosByPacienteId(undefined, pacienteId);

  const now = new Date();
  let proximoTurno: any = null;
  const historial: any[] = [];

  rows.forEach((row: any) => {
    const turno = mapTurnoPaciente(row);

    const turnoDate = new Date(`${turno.fecha}T${turno.hora ?? "00:00"}`);
    const esActivo = [1, 2].includes(Number(turno.estadoId ?? 0));
    const esFuturo = turnoDate.getTime() >= now.getTime();

    if (!proximoTurno && esActivo && esFuturo) {
      proximoTurno = turno;
    } else {
      historial.push(turno);
    }
  });

  return { proximoTurno, historial };
};
