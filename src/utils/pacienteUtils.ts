import { pool } from "../config/db";

export const obtenerPacienteIdPorUsuario = async (usuarioId: number) => {
  const [rows]: any = await pool.query(
    `SELECT paciente_id FROM paciente WHERE usuario_id = ? LIMIT 1`,
    [usuarioId]
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].paciente_id);
};

export const obtenerNutricionistaIdPorUsuario = async (usuarioId: number) => {
  const [rows]: any = await pool.query(
    `SELECT nutricionista_id FROM nutricionista WHERE usuario_id = ? LIMIT 1`,
    [usuarioId]
  );

  if (!rows.length) {
    return null;
  }

  return Number(rows[0].nutricionista_id);
};
