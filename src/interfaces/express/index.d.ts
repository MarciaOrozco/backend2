import express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        usuarioId: number;
        rol: string;
        pacienteId?: number | null;
        nutricionistaId?: number | null;
      };
      files?: Express.Multer.File[];
    }
  }
}
