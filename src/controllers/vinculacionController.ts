import type { Request, Response } from "express";
import { crearVinculacionManual } from "../services/vinculacionService";
import { handleControllerError } from "../utils/errorsUtils";

export const crearVinculacion = async (req: Request, res: Response) => {
  const { pacienteId, nutricionistaId } = req.body ?? {};

  try {
    const result = await crearVinculacionManual(
      {
        pacienteId: pacienteId ? Number(pacienteId) : undefined,
        nutricionistaId: Number(nutricionistaId),
      },
      {
        usuarioId: req.user?.usuarioId,
      }
    );

    if (result.yaExistia) {
      return res
        .status(200)
        .json({ success: true, mensaje: "Vínculo ya existente" });
    }

    return res.status(201).json({ success: true, mensaje: "Vínculo creado" });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al crear vinculación manual"
    );
  }
};
