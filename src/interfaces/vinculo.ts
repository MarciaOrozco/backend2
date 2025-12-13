import { RowDataPacket } from "mysql2/promise";

export interface RelacionPacienteProfesionalRow extends RowDataPacket {
  paciente_id: number;
  nutricionista_id: number;
}
