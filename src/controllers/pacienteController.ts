import type { Request, Response } from "express";
import {
  listarDocumentosPaciente,
  listarPlanesPaciente,
  obtenerContactoPaciente,
} from "../services/pacienteService";
import { verificarAccesoPaciente } from "../utils/vinculoUtils";
import { parsePacienteId } from "../utils/stringUtils";
import { handleControllerError } from "../utils/errorsUtils";

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
