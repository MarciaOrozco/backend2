import { RowDataPacket } from "mysql2/promise";

export interface EstadoRegistroRow extends RowDataPacket {
  estado_registro_id: number;
}
