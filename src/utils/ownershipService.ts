import { obtenerPacienteIdPorUsuario } from "../repositories/vinculoRepository";
import { DomainError } from "../types/errors";

export const ensurePacientePropietarioByUser = async (
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
