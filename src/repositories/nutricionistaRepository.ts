import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../config/db";
import type { NutricionistaFilters } from "../types/nutricionista";

interface NutricionistaRow extends RowDataPacket {
  nutricionista_id: number;
  nombre: string | null;
  apellido: string | null;
  sobre_mi: string | null;
  reputacion_promedio: number | null;
  totalOpiniones: number | null;
  especialidades: string | null;
  modalidades: string | null;
}

export const findNutricionistas = async (
  filters: NutricionistaFilters
): Promise<NutricionistaRow[]> => {
  const { nombre, especialidad, especialidades, modalidades } = filters;

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (nombre) {
    whereClauses.push(`
      LOWER(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, ''))) LIKE ?
    `);
    params.push(`%${nombre.toLowerCase()}%`);
  }

  if (especialidad) {
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM nutricionista_especialidad ne_like
        JOIN especialidad e_like ON ne_like.especialidad_id = e_like.especialidad_id
        WHERE ne_like.nutricionista_id = n.nutricionista_id
          AND LOWER(e_like.nombre) LIKE ?
      )
    `);
    params.push(`%${especialidad.toLowerCase()}%`);
  }

  if (especialidades && especialidades.length > 0) {
    const placeholders = especialidades.map(() => "?").join(", ");
    whereClauses.push(`
      (
        SELECT COUNT(DISTINCT e_match.nombre)
        FROM nutricionista_especialidad ne_match
        JOIN especialidad e_match ON ne_match.especialidad_id = e_match.especialidad_id
        WHERE ne_match.nutricionista_id = n.nutricionista_id
          AND e_match.nombre IN (${placeholders})
      ) = ?
    `);
    params.push(...especialidades, especialidades.length);
  }

  if (modalidades && modalidades.length > 0) {
    const placeholders = modalidades.map(() => "?").join(", ");
    whereClauses.push(`
      EXISTS (
        SELECT 1
        FROM nutricionista_modalidad nm_match
        JOIN modalidad m_match ON nm_match.modalidad_id = m_match.modalidad_id
        WHERE nm_match.nutricionista_id = n.nutricionista_id
          AND m_match.nombre IN (${placeholders})
      )
    `);
    params.push(...modalidades);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const [rows] = await pool.query<NutricionistaRow[]>(
    `
      SELECT
        n.nutricionista_id,
        u.nombre,
        u.apellido,
        n.sobre_mi,
        n.reputacion_promedio,
        COALESCE(COUNT(DISTINCT r.resena_id), 0) AS totalOpiniones,
        GROUP_CONCAT(DISTINCT e.nombre ORDER BY e.nombre SEPARATOR ',') AS especialidades,
        GROUP_CONCAT(DISTINCT m.nombre ORDER BY m.nombre SEPARATOR ',') AS modalidades
      FROM nutricionista n
      JOIN usuario u ON n.usuario_id = u.usuario_id
      LEFT JOIN nutricionista_especialidad ne ON n.nutricionista_id = ne.nutricionista_id
      LEFT JOIN especialidad e ON ne.especialidad_id = e.especialidad_id
      LEFT JOIN nutricionista_modalidad nm ON n.nutricionista_id = nm.nutricionista_id
      LEFT JOIN modalidad m ON nm.modalidad_id = m.modalidad_id
      LEFT JOIN resena r ON n.nutricionista_id = r.nutricionista_id
      ${whereClause}
      GROUP BY n.nutricionista_id, u.nombre, u.apellido, n.sobre_mi, n.reputacion_promedio
      ORDER BY u.nombre ASC, u.apellido ASC;
    `,
    params
  );

  return rows;
};
