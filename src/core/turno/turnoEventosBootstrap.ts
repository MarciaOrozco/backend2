import { EventoTurno } from "../../interfaces/turno";
import { createEmailService } from "../../services/EmailService";
import { GestorEventosTurno } from "./GestorEventosTurno";
import { LoggingTurnoListener } from "./LoggingTurnoListener";
import { NotificadorEmailListener } from "./NotificadorEmailListener";

/**
 * Bootstrap del gestor de eventos de turno con sus listeners.
 */
export const configurarEventosTurno = (): GestorEventosTurno => {
  const gestor = new GestorEventosTurno();

  const emailService = createEmailService();
  const listeners = [
    new NotificadorEmailListener(emailService),
    new LoggingTurnoListener(),
  ];

  const eventos = [
    EventoTurno.CREADO,
    EventoTurno.CANCELADO,
    EventoTurno.REPROGRAMADO,
  ];

  eventos.forEach((evento) =>
    listeners.forEach((listener) => gestor.subscribe(evento, listener))
  );

  return gestor;
};
