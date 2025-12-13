import type { Request, Response } from "express";
import {
  getNutricionistas as getNutricionistasService,
  getNutricionistaById as getNutricionistaByIdService,
  getPacientesVinculados as getPacientesVinculadosService,
  getTurnosNutricionista as getTurnosNutricionistaService,
  getPacientePerfilParaNutricionista as getPacientePerfilParaNutricionistaService,
  agregarPacienteManual as agregarPacienteManualService,
} from "../services/nutricionistaService";
import type { NutricionistaFilters } from "../interfaces/nutricionista";
import { handleControllerError } from "../utils/errorsUtils";
import { updateDisponibilidadNutricionista } from "../services/agendaService";
import { parseCsv } from "../utils/stringUtils";

export const getNutricionistas = async (req: Request, res: Response) => {
  try {
    const { nombre, especialidad, especialidades, modalidades } = req.query;

    const filters: NutricionistaFilters = {
      nombre: typeof nombre === "string" ? nombre : undefined,
      especialidad: typeof especialidad === "string" ? especialidad : undefined,
      especialidades: parseCsv(especialidades),
      modalidades: parseCsv(modalidades),
    };

    const data = await getNutricionistasService(filters);

    return res.json({ data });
  } catch (error) {
    console.error("Error al obtener nutricionistas:", error);
    return res.status(500).json({ error: "Error al obtener nutricionistas" });
  }
};

export const getPacientesVinculados = async (req: Request, res: Response) => {
  const nutricionistaId = Number(req.params.nutricionistaId);

  if (Number.isNaN(nutricionistaId) || nutricionistaId == undefined) {
    return res.status(400).json({ error: "nutricionistaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  if (!req.user.nutricionistaId) {
    return res
      .status(403)
      .json({ error: "Usuario no asociado a nutricionista" });
  }

  try {
    const pacientes = await getPacientesVinculadosService(nutricionistaId, {
      userId: req.user.usuarioId,
      userRol: req.user.rol,
      userNutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ pacientes });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al obtener pacientes vinculados"
    );
  }
};

export const getTurnosNutricionista = async (req: Request, res: Response) => {
  const nutricionistaId = Number(req.params.nutricionistaId);

  if (Number.isNaN(nutricionistaId)) {
    return res.status(400).json({ error: "nutricionistaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const turnos = await getTurnosNutricionistaService(nutricionistaId, {
      userId: req.user.usuarioId,
      userRol: req.user.rol,
      userNutricionistaId: req.user.nutricionistaId,
    });

    return res.json({ turnos });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al obtener turnos del nutricionista"
    );
  }
};

export const getPacientePerfilParaNutricionista = async (
  req: Request,
  res: Response
) => {
  const nutricionistaId = Number(req.params.nutricionistaId);
  const pacienteId = Number(req.params.pacienteId);

  if (Number.isNaN(nutricionistaId) || Number.isNaN(pacienteId)) {
    return res
      .status(400)
      .json({ error: "nutricionistaId y pacienteId deben ser numéricos" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const perfil = await getPacientePerfilParaNutricionistaService(
      nutricionistaId,
      pacienteId,
      {
        userId: req.user.usuarioId,
        userRol: req.user.rol,
        userNutricionistaId: req.user.nutricionistaId,
      }
    );

    return res.json({ contacto: perfil });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error al obtener el perfil del paciente"
    );
  }
};

export const agregarPacienteManual = async (req: Request, res: Response) => {
  const nutricionistaId = Number(req.params.nutricionistaId);
  const { nombre, apellido, email } = req.body ?? {};

  if (Number.isNaN(nutricionistaId)) {
    return res.status(400).json({ error: "nutricionistaId inválido" });
  }

  if (!nombre || !apellido || !email) {
    return res
      .status(400)
      .json({ error: "Nombre, apellido y email son obligatorios" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const result = await agregarPacienteManualService(
      nutricionistaId,
      { nombre, apellido, email },
      {
        userId: req.user.usuarioId,
        userRol: req.user.rol,
        userNutricionistaId: req.user.nutricionistaId,
      }
    );

    return res.status(201).json(result);
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "No se pudo completar el registro del paciente"
    );
  }
};

export const getNutricionistaById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(422).json({ error: "ID inválido" });
    }

    const nutricionista = await getNutricionistaByIdService(id);

    if (!nutricionista) {
      return res.status(404).json({ error: "No encontrado" });
    }

    return res.json(nutricionista);
  } catch (error) {
    console.error("Error al obtener nutricionista:", error);
    return res.status(500).json({ error: "Error al obtener nutricionista" });
  }
};

export const setDisponibilidad = async (req: Request, res: Response) => {
  const nutricionistaId = Number(req.params.nutricionistaId);

  if (Number.isNaN(nutricionistaId)) {
    return res.status(400).json({ error: "nutricionistaId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const rangos = Array.isArray(req.body?.rangos) ? req.body.rangos : [];

  try {
    await updateDisponibilidadNutricionista(nutricionistaId, rangos, {
      userId: req.user.usuarioId,
      userRol: req.user.rol,
      userNutricionistaId: req.user.nutricionistaId,
    });

    return res.status(204).send();
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "No se pudo actualizar la disponibilidad"
    );
  }
};
