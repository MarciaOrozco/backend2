import type { Request, Response } from "express";
import { listarConsultasPaciente as listarConsultasPacienteService } from "../services/consultaService";
import { verificarAccesoPaciente } from "../utils/vinculoUtils";
import { DomainError } from "../types/errors";

export const listarConsultasPaciente = async (req: Request, res: Response) => {
  const pacienteId = Number.parseInt(req.params.pacienteId, 10);

  if (Number.isNaN(pacienteId)) {
    return res.status(422).json({ error: "pacienteId inválido" });
  }

  try {
    // mismo chequeo de acceso que antes: paciente dueño o nutricionista/admin vinculado
    await verificarAccesoPaciente(req, pacienteId);

    const rolUsuario = req.user?.rol ?? "anon";
    const nutricionistaId = req.user?.nutricionistaId ?? null;

    const consultas = await listarConsultasPacienteService(pacienteId, {
      rolUsuario,
      nutricionistaId,
    });

    return res.json({ consultas });
  } catch (error) {
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    const status = (error as any)?.status ?? 500;
    const message = (error as any)?.message ?? "Error al listar consultas";

    console.error("Error al listar consultas:", error);
    return res.status(status).json({ error: message });
  }
};
