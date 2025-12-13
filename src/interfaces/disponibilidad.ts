import { RowDataPacket } from "mysql2/promise";

export interface RangoDisponibilidadRow extends RowDataPacket {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos?: number | null;
}
