import type { Request, Response } from "express";
import { getTurnosDisponibles as getTurnosDisponiblesService } from "../services/agendaService";
import { DomainError } from "../types/errors";

const handleControllerError = (
  res: Response,
  error: unknown,
  fallbackMessage: string
) => {
  if (error instanceof DomainError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
};

export const getTurnosDisponibles = async (req: Request, res: Response) => {
  const { nutricionistaId } = req.params;
  const { fecha, estrategia, intervalo } = req.query;

  const nutricionistaIdNum = Number(nutricionistaId);
  if (Number.isNaN(nutricionistaIdNum)) {
    return res.status(400).json({ error: "nutricionistaId inválido" });
  }

  if (!fecha || typeof fecha !== "string") {
    return res
      .status(400)
      .json({ error: "Debe enviar la fecha en formato YYYY-MM-DD" });
  }

  const parts = fecha.split("-").map((value) => Number.parseInt(value, 10));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return res.status(400).json({ error: "Fecha inválida" });
  }

  const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: "Fecha inválida" });
  }

  const dayName = targetDate
    .toLocaleDateString("es-ES", { weekday: "long" })
    .toLowerCase();

  try {
    const result = await getTurnosDisponiblesService({
      nutricionistaId: nutricionistaIdNum,
      fecha,
      dayName,
      estrategia: typeof estrategia === "string" ? estrategia : undefined,
      intervalo: typeof intervalo === "string" ? intervalo : undefined,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, error, "Error al obtener disponibilidad");
  }
};
