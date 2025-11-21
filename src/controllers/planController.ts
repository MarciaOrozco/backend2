import type { Request, Response } from "express";
import fs from "fs";
import {
  updatePlan as updatePlanService,
  createAiPlan as createAiPlanService,
  createManualPlan as createManualPlanService,
  exportarPlan as exportarPlanService,
  getPlanById as getPlanByIdService,
  markPlanAsValidated as markPlanAsValidatedService,
  eliminarPlan as eliminarPlanService,
} from "../services/planService";
import { handleControllerError } from "../utils/errorsUtils";

const parsePlanId = (req: Request): number | null => {
  const planId = Number.parseInt(req.params.planId, 10);
  return Number.isNaN(planId) ? null : planId;
};

export const crearPlanManual = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const plan = await createManualPlanService(req.body, {
      rol: req.user.rol,
      usuarioId: req.user.usuarioId,
      pacienteId: req.user.pacienteId,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.status(201).json({ plan });
  } catch (error) {
    return handleControllerError(res, error, "Error al crear el plan");
  }
};

export const crearPlanIA = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const plan = await createAiPlanService(req.body, {
      rol: req.user.rol,
      usuarioId: req.user.usuarioId,
      pacienteId: req.user.pacienteId,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.status(201).json({ plan });
  } catch (error) {
    return handleControllerError(res, error, "No fue posible generar el plan");
  }
};

export const obtenerPlan = async (req: Request, res: Response) => {
  const planId = parsePlanId(req);
  if (!planId) {
    return res.status(422).json({ error: "planId invalido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const plan = await getPlanByIdService(planId, {
      rol: req.user.rol,
      pacienteId: req.user.pacienteId,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ plan });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al obtener el plan alimentario"
    );
  }
};

export const actualizarPlan = async (req: Request, res: Response) => {
  const planId = parsePlanId(req);
  if (!planId) {
    return res.status(422).json({ error: "planId invalido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const plan = await updatePlanService(planId, req.body ?? {}, {
      rol: req.user.rol,
      pacienteId: req.user.pacienteId,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ plan });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al actualizar el plan alimentario"
    );
  }
};

export const validarPlan = async (req: Request, res: Response) => {
  const planId = parsePlanId(req);
  if (!planId) {
    return res.status(422).json({ error: "planId invalido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const plan = await markPlanAsValidatedService(
      planId,
      req.body?.estado,
      {
        rol: req.user.rol,
        pacienteId: req.user.pacienteId,
        nutricionistaId: req.user.nutricionistaId,
      }
    );

    return res.json({
      plan,
      message:
        plan.status === "enviado"
          ? "Plan validado y enviado al paciente"
          : "Plan validado correctamente",
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al validar el plan alimentario"
    );
  }
};

export const exportarPlan = async (req: Request, res: Response) => {
  const planId = parsePlanId(req);
  if (!planId) {
    return res.status(422).json({ error: "planId invalido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const { filePath, fileName } = await exportarPlanService(planId, {
      rol: req.user.rol,
      pacienteId: req.user.pacienteId,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.download(filePath, fileName, (err) => {
      fs.unlink(filePath, () => undefined);
      if (err && !res.headersSent) {
        res
          .status(500)
          .json({ error: "Error al exportar el plan alimentario" });
      }
    });
  } catch (error) {
    return handleControllerError(res, error, "Error al exportar el plan");
  }
};

export const eliminarPlan = async (req: Request, res: Response) => {
  const planId = parsePlanId(req);
  if (!planId) {
    return res.status(422).json({ error: "planId invalido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    await eliminarPlanService(planId, {
      rol: req.user.rol,
      pacienteId: req.user.pacienteId,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ success: true });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al eliminar el plan alimentario"
    );
  }
};
