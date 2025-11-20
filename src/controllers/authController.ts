import type { Request, Response } from "express";
import {
  registerPaciente,
  loginUsuario,
  obtenerSesion,
} from "../services/authService";
import { handleControllerError } from "../utils/errorsUtils";

export const register = async (req: Request, res: Response) => {
  try {
    const result = await registerPaciente(req.body ?? {});
    return res.status(201).json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "No se pudo completar el registro"
    );
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const result = await loginUsuario(req.body ?? {});
    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, "No se pudo iniciar sesión");
  }
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const session = await obtenerSesion(req.user.usuarioId);
    return res.json(session);
  } catch (error) {
    return handleControllerError(res, error, "No se pudo recuperar la sesión");
  }
};
