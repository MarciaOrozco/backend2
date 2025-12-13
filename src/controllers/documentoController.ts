import type { Request, Response } from "express";
import { crearDocumentosService } from "../services/documentoService";
import { handleControllerError } from "../utils/errorsUtils";

export const crearDocumentos = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { pacienteId, descripcion } = req.body ?? {};

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const documentos = await crearDocumentosService(
      files,
      { pacienteId: pacienteId ? Number(pacienteId) : undefined, descripcion },
      { userId: req.user.usuarioId, rol: req.user.rol }
    );

    return res.status(201).json({ success: true, documentos });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Ocurrió un error al guardar los documentos"
    );
  }
};
