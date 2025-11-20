import { DomainError } from "../types/errors";
import type { Request, Response } from "express";

export class ForbiddenError extends Error {
  status = 403;

  constructor(message = "No autorizado para operar con este paciente") {
    super(message);
  }
}

export const handleControllerError = (
  res: Response,
  error: unknown,
  fallbackMessage: string
) => {
  // Primero maneja DomainError (incluye ForbiddenError si hereda de DomainError)
  if (error instanceof DomainError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  // Luego maneja otros errores que tengan la propiedad status
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as any).status) || 500;
    const message =
      (error as any).message ?? (error as any).error ?? fallbackMessage;
    return res.status(status).json({ error: message });
  }

  // Fallback para errores desconocidos
  console.error(fallbackMessage, error);
  return res.status(500).json({ error: fallbackMessage });
};
