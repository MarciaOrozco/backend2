import { Turno } from "../../types/turno";
import type { EventoTurno, EventoTurnoPayload } from "../../types/turno";

export interface IListenerTurno {
  update(
    turno: Turno,
    evento: EventoTurno,
    payload?: EventoTurnoPayload
  ): void | Promise<void>;
}
