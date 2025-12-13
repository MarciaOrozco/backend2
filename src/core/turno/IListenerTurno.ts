import { Turno } from "../../interfaces/turno";
import type { EventoTurno, EventoTurnoPayload } from "../../interfaces/turno";

export interface IListenerTurno {
  update(
    turno: Turno,
    evento: EventoTurno,
    payload?: EventoTurnoPayload
  ): void | Promise<void>;
}
