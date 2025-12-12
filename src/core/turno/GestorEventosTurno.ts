import type { EventoTurno, EventoTurnoPayload } from "../../types/turno";
import type { IListenerTurno } from "./IListenerTurno";
import type { Turno } from "../../types/turno";

export class GestorEventosTurno {
  private readonly listeners: Map<EventoTurno, IListenerTurno[]> = new Map();

  subscribe(evento: EventoTurno, listener: IListenerTurno): void {
    const listenersEvento = this.listeners.get(evento) ?? [];

    const yaSuscripto = listenersEvento.includes(listener);
    if (!yaSuscripto) {
      listenersEvento.push(listener);
      this.listeners.set(evento, listenersEvento);
    }
  }

  unsubscribe(evento: EventoTurno, listener: IListenerTurno): void {
    const listenersEvento = this.listeners.get(evento);
    if (!listenersEvento) return;

    const filtrados = listenersEvento.filter((l) => l !== listener);
    if (filtrados.length) {
      this.listeners.set(evento, filtrados);
    } else {
      this.listeners.delete(evento);
    }
  }

  async notify(
    evento: EventoTurno,
    turno: Turno,
    payload?: EventoTurnoPayload
  ): Promise<void> {
    const listenersEvento = this.listeners.get(evento);
    if (!listenersEvento || !listenersEvento.length) return;

    const ejecuciones = listenersEvento.map((listener) =>
      Promise.resolve(listener.update(turno, evento, payload)).catch(
        (error) => {
          console.error("Error al notificar evento de turno", {
            error,
            evento,
            listener: listener.constructor?.name ?? "desconocido",
            turnoId: turno.id,
          });
        }
      )
    );

    await Promise.all(ejecuciones);
  }
}
