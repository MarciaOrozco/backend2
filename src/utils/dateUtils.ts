/**
 * Parsea una fecha en formato YYYY-MM-DD y retorna un objeto Date
 * @returns Date válido o null si la fecha es inválida
 */
export const parseDateFromString = (dateString: string): Date | null => {
  if (!dateString || typeof dateString !== "string") {
    return null;
  }

  const parts = dateString
    .split("-")
    .map((value) => Number.parseInt(value, 10));

  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  // Verifica que la fecha sea válida
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Obtiene el nombre del día en español (lowercase)
 */
export const getDayName = (date: Date): string => {
  return date.toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();
};

export const parseDateQuery = (
  fecha: unknown
): { date: Date; dayName: string } | null => {
  if (typeof fecha !== "string") {
    return null;
  }

  const date = parseDateFromString(fecha);
  if (!date) {
    return null;
  }

  return {
    date,
    dayName: getDayName(date),
  };
};

export const toDateISO = (value: any): string | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return value.slice(0, 10);
  }
  try {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  } catch {}
  return null;
};

export const formatDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return String(value);
};

export const formatHora = (value: any) => {
  if (!value) return "";
  return value.toString().slice(0, 5);
};

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const toTime = (minutesTotal: number) => {
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export const normalizarHora = (value: string) => value.slice(0, 5);

export const isValidTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

export const toDateString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

export const parseDate = (value: any): string => {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};
