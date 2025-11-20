import type { Request, Response } from "express";
import { listarConsultasPaciente as listarConsultasPacienteService } from "../services/consultaService";
import { verificarAccesoPaciente } from "../utils/vinculoUtils";
import { DomainError } from "../types/errors";
import { parsePacienteId } from "../utils/stringUtils";

export const listarConsultasPaciente = async (req: Request, res: Response) => {
  const pacienteId = parsePacienteId(req);

  if (!pacienteId) {
    return res.status(400).json({ error: "pacienteId inválido" });
  }

  try {
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
