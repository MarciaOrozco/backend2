import { Turno, nombreCompleto } from "../types/turno";

export interface CalendarData {
  calendarLink: string | null;
  icsContent: string | null;
}

const pad = (value: number): string => String(value).padStart(2, "0");

const buildLocalDate = (fecha: string, hora: string): Date => {
  // Se interpreta como horario local del servidor.
  return new Date(`${fecha}T${hora || "00:00"}:00`);
};

const formatDateForCalendar = (date: Date): string => {
  // Formato YYYYMMDDTHHmmssZ en UTC.
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
};

const escapeICS = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

const buildIcsContent = (
  title: string,
  description: string,
  location: string,
  start: Date,
  end: Date
): string => {
  const dtStamp = formatDateForCalendar(new Date());
  const dtStart = formatDateForCalendar(start);
  const dtEnd = formatDateForCalendar(end);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nutrito//Turnos//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@nutrito`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    description ? `DESCRIPTION:${escapeICS(description)}` : undefined,
    location ? `LOCATION:${escapeICS(location)}` : undefined,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\n");
};

export const buildCalendarDataFromTurno = (
  turno: Turno,
  duracionMinutos: number = 60
): CalendarData => {
  if (!turno.fecha || !turno.hora) {
    return { calendarLink: null, icsContent: null };
  }

  const start = buildLocalDate(turno.fecha, turno.hora);
  const end = new Date(start.getTime() + duracionMinutos * 60 * 1000);

  const nutriName = nombreCompleto(turno.nutricionista) || "tu nutricionista";
  const pacienteName = nombreCompleto(turno.paciente) || "Paciente";

  const title = `Consulta con ${nutriName}`;
  const description = `${pacienteName} tiene una consulta con ${nutriName}.`;
  const location = turno.modalidadId ? `Modalidad ${turno.modalidadId}` : "";

  const datesParam = `${formatDateForCalendar(start)}/${formatDateForCalendar(
    end
  )}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    dates: datesParam,
  });

  if (location) {
    params.append("location", location);
  }

  const calendarLink = `https://calendar.google.com/calendar/render?${params.toString()}`;
  const icsContent = buildIcsContent(title, description, location, start, end);

  return { calendarLink, icsContent };
};
