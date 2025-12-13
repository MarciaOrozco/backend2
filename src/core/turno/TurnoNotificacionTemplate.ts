import { Turno } from "../../interfaces/turno";
import { EventoTurno } from "../../interfaces/turno";
import type { TurnoParticipante } from "../../interfaces/turno";

export interface NotificacionMensaje {
  subject: string;
  body: string;
}

const nombreCompleto = (p: TurnoParticipante): string =>
  [p.nombre, p.apellido].filter(Boolean).join(" ").trim();

export class TurnoNotificacionTemplate {
  static build(turno: Turno, evento: EventoTurno): NotificacionMensaje {
    const fechaHora = `${turno.fecha} ${turno.hora}`;
    const nutriNombre = nombreCompleto(turno.nutricionista) || "el profesional";

    switch (evento) {
      case EventoTurno.CREADO:
        return {
          subject: "Turno creado",
          body: `Se creó el turno #${turno.id} para el ${fechaHora} con ${nutriNombre}.`,
        };

      case EventoTurno.CANCELADO:
        return {
          subject: "Turno cancelado",
          body: `El turno #${turno.id} programado para el ${fechaHora} fue cancelado.`,
        };

      case EventoTurno.REPROGRAMADO:
        return {
          subject: "Turno reprogramado",
          body: `El turno #${turno.id} fue reprogramado para el ${fechaHora} con ${nutriNombre}.`,
        };

      default:
        return {
          subject: "Actualización de turno",
          body: `El turno #${turno.id} tuvo una actualización (${evento}) para el ${fechaHora}.`,
        };
    }
  }
}
