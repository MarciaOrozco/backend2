/**
 * Parsea una fecha en formato YYYY-MM-DD de forma estricta.
 * Retorna Date válido o null si la fecha es inválida.
 */
export const parseISODate = (value: unknown): Date | null => {
  if (typeof value !== "string") {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Convierte un valor a string ISO corto (YYYY-MM-DD).
 * Retorna null si no es una fecha válida.
 */
export const toISODateString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value as any);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

/**
 * Dado un string de fecha YYYY-MM-DD, retorna Date y nombre del día en español.
 */
export const parseDateQuery = (
  value: unknown
): { date: Date; dayName: string } | null => {
  const date = parseISODate(value);
  if (!date) {
    return null;
  }

  return {
    date,
    dayName: getDayName(date),
  };
};

/**
 * Retorna el nombre del día en español (lowercase).
 */
export const getDayName = (date: Date): string => {
  return date.toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();
};

/**
 * =========================
 * HORAS
 * =========================
 */

/**
 * Normaliza un valor a formato HH:mm.
 */
export const normalizeTime = (value: unknown): string => {
  if (!value) {
    return "";
  }

  return value.toString().slice(0, 5);
};

/**
 * Valida si un string tiene formato HH:mm.
 */
export const isValidTime = (value: string): boolean => {
  return /^\d{2}:\d{2}$/.test(value);
};

/**
 * Convierte HH:mm a minutos totales.
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Convierte minutos totales a HH:mm.
 */
export const minutesToTime = (minutesTotal: number): string => {
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};
