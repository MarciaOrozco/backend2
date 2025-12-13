import { RowDataPacket } from "mysql2/promise";

export interface RolRow extends RowDataPacket {
  rol_id: number;
}
