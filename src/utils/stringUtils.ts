import type { Request } from "express";

export const normalizeEmail = (email?: string | null): string | null => {
  if (!email) {
    return null;
  }

  const normalized = String(email).trim().toLowerCase();
  return normalized.length ? normalized : null;
};

export const normalizeText = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
};

export const parsePacienteId = (req: Request): number | null => {
  const raw = req.params.pacienteId ?? req.params.id;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

export const parseCsv = (value?: unknown): string[] | undefined =>
  typeof value === "string"
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : undefined;

export const parseDbCsv = (value?: unknown): string[] =>
  typeof value === "string"
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
