import type { Request, Response } from "express";
import {
  listarConsultasPaciente as listarConsultasPacienteService,
  obtenerEvolucionPacienteService,
} from "../services/consultaService";
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

export const obtenerEvolucionPaciente = async (req: Request, res: Response) => {
  const pacienteId = Number.parseInt(req.params.pacienteId, 10);

  if (Number.isNaN(pacienteId)) {
    return res.status(400).json({ error: "pacienteId inválido" });
  }

  try {
    await verificarAccesoPaciente(req, pacienteId);

    const registros = await obtenerEvolucionPacienteService(pacienteId);

    if (registros.length < 2) {
      return res
        .status(204)
        .json({ message: "No hay registros en el período seleccionado" });
    }

    return res.json(registros);
  } catch (error) {
    const status = (error as any)?.status ?? 500;
    const message =
      (error as any)?.message ??
      "No fue posible obtener la evolución del paciente";

    console.error("Error al obtener evolución del paciente:", error);
    return res.status(status).json({ error: message });
  }
};
