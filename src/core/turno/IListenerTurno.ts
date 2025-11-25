import { Turno } from "../../types/turno";
import type { EventoTurno } from "../../types/turno";

export interface IListenerTurno {
  update(turno: Turno, evento: EventoTurno): void;
}
