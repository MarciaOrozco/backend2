// utils/dateUtils.ts

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

/**
 * Valida y parsea una fecha desde query string
 * @returns { date, dayName } o null si es inválida
 */
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
