import type { Request, Response } from "express";
import {
  listarDocumentosPaciente,
  listarPlanesPaciente,
  obtenerContactoPaciente,
} from "../services/pacienteService";
import { DomainError } from "../types/errors";
import { verificarAccesoPaciente } from "../utils/vinculoUtils";

const parsePacienteId = (req: Request): number | null => {
  const raw = req.params.pacienteId ?? req.params.id;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const handleControllerError = (
  res: Response,
  error: unknown,
  fallbackMessage: string
) => {
  if (error instanceof DomainError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as any).status) || 500;
    const message =
      (error as any).message ?? (error as any).error ?? fallbackMessage;
    return res.status(status).json({ error: message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
};

export const obtenerPerfilPaciente = async (req: Request, res: Response) => {
  const pacienteId = parsePacienteId(req);

  if (!pacienteId) {
    return res.status(400).json({ error: "pacienteId inválido" });
  }

  try {
    const contacto = await obtenerContactoPaciente(pacienteId);
    res.json({ contacto });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al obtener el perfil del paciente"
    );
  }
};

export const obtenerDocumentosPaciente = async (
  req: Request,
  res: Response
) => {
  const pacienteId = parsePacienteId(req);

  if (!pacienteId) {
    return res.status(400).json({ error: "pacienteId inválido" });
  }

  try {
    // 🔐 Permite acceso a paciente dueño o nutricionista vinculado
    await verificarAccesoPaciente(req, pacienteId);

    const documentos = await listarDocumentosPaciente(pacienteId);
    res.json({ documentos });
  } catch (error: any) {
    return handleControllerError(
      res,
      error,
      "Error al obtener documentos del paciente"
    );
  }
};
export const obtenerPlanesPaciente = async (req: Request, res: Response) => {
  const pacienteId = parsePacienteId(req);

  if (!pacienteId) {
    return res.status(400).json({ error: "pacienteId inválido" });
  }

  try {
    await verificarAccesoPaciente(req, pacienteId);
    const planes = await listarPlanesPaciente(pacienteId);
    res.json({ planes });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al obtener planes alimentarios"
    );
  }
};
