import { DomainError } from "../types/errors";
import {
  ConsultaEvolucionRow,
  findConsultasByPaciente,
  findEvolucionByPacienteId,
  type ConsultaListadoRow,
} from "../repositories/consultaRepository";
import { toDateISO } from "../utils/dateUtils";

interface ListarConsultasPacienteContext {
  rolUsuario: string;
  nutricionistaId?: number | null;
}

export interface RegistroEvolucion {
  fecha_consulta: string | null;
  peso: number | null;
  imc: number | null;
  cintura: number | null;
  porcentaje_grasa: number | null;
  meta_peso: number | null;
}

/**
 * Lista consultas de un paciente.
 * - Paciente / admin: ven todas las consultas del paciente.
 * - Nutricionista: solo sus propias consultas (mismo filtro que tenías antes).
 */
export const listarConsultasPaciente = async (
  pacienteId: number,
  context: ListarConsultasPacienteContext
): Promise<ConsultaListadoRow[]> => {
  const { rolUsuario, nutricionistaId } = context;

  let filtroNutricionistaId: number | undefined;

  if (rolUsuario === "nutricionista") {
    if (!nutricionistaId) {
      throw new DomainError("Nutricionista no registrado", 403);
    }
    filtroNutricionistaId = nutricionistaId;
  } else {
    filtroNutricionistaId = undefined;
  }

  const consultas = await findConsultasByPaciente(
    undefined,
    pacienteId,
    filtroNutricionistaId
  );

  return consultas;
};

/**
 * Devuelve la evolución cruda del paciente (sin decidir el código HTTP).
 * El controller se encarga de status 204 vs 200.
 */
export const obtenerEvolucionPacienteService = async (
  pacienteId: number
): Promise<RegistroEvolucion[]> => {
  const rows = await findEvolucionByPacienteId(undefined, pacienteId);

  const registros: RegistroEvolucion[] = rows
    .map((row: ConsultaEvolucionRow) => ({
      fecha_consulta: toDateISO(row.fecha_consulta),
      peso: row.peso != null ? Number(row.peso) : null,
      imc: row.imc != null ? Number(row.imc) : null,
      cintura: row.cintura != null ? Number(row.cintura) : null,
      porcentaje_grasa:
        row.porcentaje_grasa != null ? Number(row.porcentaje_grasa) : null,
      meta_peso: row.meta_peso != null ? Number(row.meta_peso) : null,
    }))
    .filter((registro) => {
      if (!registro.fecha_consulta) return false;
      return [
        registro.peso,
        registro.imc,
        registro.cintura,
        registro.porcentaje_grasa,
      ].some((valor) => valor != null);
    });

  return registros;
};
