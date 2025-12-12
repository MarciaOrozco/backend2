import { insertTurnoLogEvento } from "../../repositories/turnoRepository";
import { EventoTurno, EventoTurnoPayload, Turno } from "../../types/turno";
import type { IListenerTurno } from "./IListenerTurno";

/**
 * Listener que registra los eventos del turno en log_eventos.
 */
export class LoggingTurnoListener implements IListenerTurno {
  async update(
    turno: Turno,
    evento: EventoTurno,
    payload?: EventoTurnoPayload
  ): Promise<void> {
    const mensaje = payload?.mensaje ?? this.buildMensaje(turno, evento);
    if (!mensaje) return;

    await insertTurnoLogEvento(turno.id, mensaje);
  }

  private buildMensaje(turno: Turno, evento: EventoTurno): string {
    const fechaHora = `${turno.fecha} ${turno.hora}`;

    switch (evento) {
      case EventoTurno.CREADO:
        return `Turno creado para el ${fechaHora}`;

      case EventoTurno.CANCELADO:
        return `Turno #${turno.id} cancelado`;

      case EventoTurno.REPROGRAMADO:
        return `Turno #${turno.id} reprogramado al ${fechaHora}`;

      default:
        return `Evento ${evento} registrado para el turno #${turno.id}`;
    }
  }
}
