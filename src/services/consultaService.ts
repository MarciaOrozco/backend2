import { DomainError } from "../types/errors";
import {
  findConsultasByPaciente,
  type ConsultaListadoRow,
} from "../repositories/consultaRepository";

interface ListarConsultasPacienteContext {
  rolUsuario: string;
  nutricionistaId?: number | null;
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
