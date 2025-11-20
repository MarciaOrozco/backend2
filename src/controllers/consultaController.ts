import type { Request, Response } from "express";
import fs from "fs";
import {
  crearConsultaService,
  listarConsultasPaciente as listarConsultasPacienteService,
  obtenerConsultaService,
  actualizarConsultaService,
  eliminarConsultaService,
  subirDocumentosConsultaService,
  exportarConsultaService,
  programarProximaCitaService,
  obtenerEvolucionPacienteService,
} from "../services/consultaService";
import { verificarAccesoPaciente } from "../utils/vinculoUtils";
import { parsePacienteId } from "../utils/stringUtils";
import { handleControllerError } from "../utils/errorsUtils";

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
    return handleControllerError(res, error, "Error al listar consultas");
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
    return handleControllerError(
      res,
      error,
      "No fue posible obtener la evolución del paciente"
    );
  }
};

export const crearConsulta = async (req: Request, res: Response) => {
  const pacienteId = Number.parseInt(
    req.body.pacienteId ?? req.body.paciente_id,
    10
  );

  if (Number.isNaN(pacienteId)) {
    return res.status(422).json({ error: "pacienteId es obligatorio" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const result = await crearConsultaService(pacienteId, {
      rol: req.user.rol,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleControllerError(res, error, "Error al crear consulta");
  }
};

export const obtenerConsulta = async (req: Request, res: Response) => {
  console.log("ENTRE A CONSULTA CONTROLLER");
  const consultaId = Number.parseInt(req.params.consultaId, 10);

  if (Number.isNaN(consultaId)) {
    return res.status(422).json({ error: "consultaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const result = await obtenerConsultaService(consultaId, {
      rol: req.user.rol,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.json(result);
  } catch (error) {
    return handleControllerError(res, error, "Error al obtener consulta");
  }
};

export const actualizarConsulta = async (req: Request, res: Response) => {
  const consultaId = Number.parseInt(req.params.consultaId, 10);

  if (Number.isNaN(consultaId)) {
    return res.status(422).json({ error: "consultaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    await actualizarConsultaService(consultaId, req.body ?? {}, {
      rol: req.user.rol,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ success: true });
  } catch (error) {
    return handleControllerError(res, error, "Error al actualizar consulta");
  }
};

export const eliminarConsulta = async (req: Request, res: Response) => {
  const consultaId = Number.parseInt(req.params.consultaId, 10);

  if (Number.isNaN(consultaId)) {
    return res.status(422).json({ error: "consultaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    await eliminarConsultaService(consultaId, req.body ?? {}, {
      rol: req.user.rol,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ success: true });
  } catch (error) {
    return handleControllerError(res, error, "Error al eliminar consulta");
  }
};

export const subirDocumentosConsulta = async (req: Request, res: Response) => {
  const consultaId = Number.parseInt(req.params.consultaId, 10);

  if (Number.isNaN(consultaId)) {
    return res.status(422).json({ error: "consultaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const files = req.files as Express.Multer.File[];

  try {
    const documentos = await subirDocumentosConsultaService(consultaId, files, {
      rol: req.user.rol,
      nutricionistaId: req.user.nutricionistaId,
    });

    return res.status(201).json({ documentos });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al adjuntar documentos a la consulta"
    );
  }
};

export const exportarConsulta = async (req: Request, res: Response) => {
  const consultaId = Number.parseInt(req.params.consultaId, 10);
  const { secciones = [] } = req.body ?? {};

  if (Number.isNaN(consultaId)) {
    return res.status(422).json({ error: "consultaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const { filePath, fileName } = await exportarConsultaService(
      consultaId,
      Array.isArray(secciones) ? secciones : [],
      {
        rol: req.user.rol,
        nutricionistaId: req.user.nutricionistaId,
      }
    );

    return res.download(filePath, fileName, (err) => {
      fs.unlink(filePath, () => undefined);
      if (err) {
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "Error al exportar la consulta en PDF" });
        }
      }
    });
  } catch (error) {
    return handleControllerError(res, error, "Error al exportar consulta");
  }
};

export const programarProximaCita = async (req: Request, res: Response) => {
  const consultaId = Number.parseInt(req.params.consultaId, 10);
  const { fecha, hora, modalidadId, metodoPagoId } = req.body ?? {};

  if (Number.isNaN(consultaId)) {
    return res.status(422).json({ error: "consultaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const { turnoId } = await programarProximaCitaService(
      consultaId,
      { fecha, hora, modalidadId, metodoPagoId },
      {
        rol: req.user.rol,
        nutricionistaId: req.user.nutricionistaId,
      }
    );

    return res.status(201).json({ turnoId });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al programar la próxima consulta"
    );
  }
};
