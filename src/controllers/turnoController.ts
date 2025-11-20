import type { Request, Response } from "express";
import { getTurnosDisponibles as getTurnosDisponiblesService } from "../services/agendaService";
import { DomainError } from "../types/errors";
import {
  cancelarTurnoService,
  createTurno as createTurnoService,
  obtenerTurnosPaciente,
} from "../services/turnoService";
import { verificarAccesoPaciente } from "../utils/vinculoUtils";
import { handleControllerError } from "../utils/errorsUtils";
import { parseDateQuery } from "../utils/dateUtils";

export const getTurnosDisponibles = async (req: Request, res: Response) => {
  const { nutricionistaId } = req.params;
  const { fecha, estrategia, intervalo } = req.query;

  const nutricionistaIdNum = Number(nutricionistaId);
  if (Number.isNaN(nutricionistaIdNum)) {
    return res.status(400).json({ error: "nutricionistaId inválido" });
  }

  const parsedDate = parseDateQuery(fecha);
  if (!parsedDate) {
    return res
      .status(400)
      .json({ error: "Debe enviar la fecha en formato YYYY-MM-DD" });
  }

  try {
    const result = await getTurnosDisponiblesService({
      nutricionistaId: nutricionistaIdNum,
      fecha: fecha as string,
      dayName: parsedDate.dayName,
      estrategia: typeof estrategia === "string" ? estrategia : undefined,
      intervalo: typeof intervalo === "string" ? intervalo : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, error, "Error al obtener disponibilidad");
  }
};

// 2️⃣ Crear un nuevo turno
export const createTurno = async (req: Request, res: Response) => {
  const {
    fecha,
    hora,
    paciente_id,
    nutricionista_id,
    modalidad_id,
    metodo_pago_id,
    pacienteId,
    nutricionistaId,
    modalidadId,
    metodoPagoId,
  } = req.body ?? {};

  if (!fecha || !hora) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  let pacienteIdValue = paciente_id ?? pacienteId;
  const nutricionistaIdValue = nutricionista_id ?? nutricionistaId;

  if (!pacienteIdValue || !nutricionistaIdValue) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const result = await createTurnoService(
      {
        fecha,
        hora,
        pacienteId: Number(pacienteIdValue),
        nutricionistaId: Number(nutricionistaIdValue),
        modalidadId: modalidad_id ?? modalidadId ?? null,
        metodoPagoId: metodo_pago_id ?? metodoPagoId ?? null,
      },
      {
        userRol: req.user.rol,
        userId: req.user.usuarioId,
      }
    );

    return res.status(201).json({
      message: "Turno creado con éxito",
      turno_id: result.turnoId,
    });
  } catch (error) {
    return handleControllerError(res, error, "Error al crear turno");
  }
};

export const getTurnosPaciente = async (req: Request, res: Response) => {
  const pacienteId = Number(req.params.pacienteId ?? req.params.id);

  if (Number.isNaN(pacienteId)) {
    return res.status(400).json({ error: "pacienteId inválido" });
  }

  try {
    await verificarAccesoPaciente(req, pacienteId);

    const result = await obtenerTurnosPaciente(pacienteId);

    return res.json(result);
  } catch (error) {
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error al obtener turnos del paciente:", error);
    return res.status(500).json({
      error: "Error al obtener turnos del paciente",
    });
  }
};

export const cancelarTurno = async (req: Request, res: Response) => {
  const turnoId = Number(req.params.id);
  const { motivo }: { motivo?: string } = req.body ?? {};

  if (Number.isNaN(turnoId)) {
    return res.status(400).json({ error: "Parámetro turnoId inválido" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    await cancelarTurnoService(turnoId, motivo, {
      userId: req.user.usuarioId,
      userRol: req.user.rol,
    });

    return res.json({
      success: true,
      message: "Turno cancelado correctamente",
    });
  } catch (error) {
    return handleControllerError(res, error, "Error al cancelar turno");
  }
};
