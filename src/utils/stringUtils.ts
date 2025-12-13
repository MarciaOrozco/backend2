import type { Request } from "express";

const EMAIL_REGEX =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const validateAndNormalizeEmail = (email?: string | null): string => {
  if (!email) {
    throw new Error("Email es requerido");
  }

  const normalized = String(email).trim().toLowerCase();

  if (!normalized.length) {
    throw new Error("Email es requerido");
  }

  if (!EMAIL_REGEX.test(normalized)) {
    throw new Error("Email inválido");
  }

  return normalized;
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
export const parseJson = <T>(value: any, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch (_error) {
    return fallback;
  }
};

export const parseNumber = (value: any): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};
