import { pool } from "../config/db";
import type {
  EducacionRow,
  EspecialidadRow,
  MetodoPagoRow,
  ModalidadRow,
  NutricionistaBaseRow,
  NutricionistaFilters,
  NutricionistaRow,
  ObraSocialRow,
  PacienteVinculadoRow,
  ResenaRow,
} from "../types/nutricionista";
import type { Pool, PoolConnection } from "mysql2/promise";

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

// ---------------- BASE ----------------

export const findNutricionistaBaseById = async (
  id: number
): Promise<NutricionistaBaseRow | null> => {
  const [rows] = await pool.query<NutricionistaBaseRow[]>(
    `
      SELECT n.*, u.nombre, u.apellido, u.email
      FROM nutricionista n
      JOIN usuario u ON n.usuario_id = u.usuario_id
      WHERE n.nutricionista_id = ?
    `,
    [id]
  );

  return rows[0] ?? null;
};

// ---------------- ESPECIALIDADES ----------------

export const findEspecialidadesByNutricionista = async (
  id: number
): Promise<string[]> => {
  const [rows] = await pool.query<EspecialidadRow[]>(
    `
      SELECT e.nombre
      FROM nutricionista_especialidad ne
      JOIN especialidad e ON ne.especialidad_id = e.especialidad_id
      WHERE ne.nutricionista_id = ?
      ORDER BY e.nombre
    `,
    [id]
  );

  return rows.map((r) => r.nombre);
};

// ---------------- MODALIDADES ----------------

export const findModalidadesByNutricionista = async (
  id: number
): Promise<ModalidadRow[]> => {
  const [rows] = await pool.query<ModalidadRow[]>(
    `
      SELECT m.modalidad_id, m.nombre
      FROM nutricionista_modalidad nm
      JOIN modalidad m ON nm.modalidad_id = m.modalidad_id
      WHERE nm.nutricionista_id = ?
      ORDER BY m.nombre
    `,
    [id]
  );

  return rows;
};

// ---------------- EDUCACIÓN ----------------

export const findEducacionByNutricionista = async (
  id: number
): Promise<EducacionRow[]> => {
  const [rows] = await pool.query<EducacionRow[]>(
    `
      SELECT educacion_id, titulo, institucion, descripcion
      FROM educacion
      WHERE nutricionista_id = ?
      ORDER BY educacion_id DESC
    `,
    [id]
  );

  return rows;
};

// ---------------- MÉTODOS DE PAGO ----------------

export const findMetodosPagoByNutricionista = async (
  id: number
): Promise<MetodoPagoRow[]> => {
  const [rows] = await pool.query<MetodoPagoRow[]>(
    `
      SELECT mp.metodo_pago_id, mp.nombre, mp.descripcion
      FROM nutricionista_metodo_pago nmp
      JOIN metodo_pago mp ON nmp.metodo_pago_id = mp.metodo_pago_id
      WHERE nmp.nutricionista_id = ?
      ORDER BY mp.nombre
    `,
    [id]
  );

  return rows;
};

// ---------------- OBRAS SOCIALES ----------------

export const findObrasSocialesByNutricionista = async (
  id: number
): Promise<ObraSocialRow[]> => {
  const [rows] = await pool.query<ObraSocialRow[]>(
    `
      SELECT os.obra_social_id, os.nombre
      FROM nutricionista_obra_social nos
      JOIN obra_social os ON nos.obra_social_id = os.obra_social_id
      WHERE nos.nutricionista_id = ?
      ORDER BY os.nombre
    `,
    [id]
  );

  return rows;
};

// ---------------- RESEÑAS ----------------

export const findResenasByNutricionista = async (
  id: number
): Promise<ResenaRow[]> => {
  const [rows] = await pool.query<ResenaRow[]>(
    `
      SELECT
        r.resena_id,
        r.fecha,
        r.comentario,
        r.puntuacion,
        u.nombre AS paciente_nombre,
        u.apellido AS paciente_apellido
      FROM resena r
      LEFT JOIN paciente p ON r.paciente_id = p.paciente_id
      LEFT JOIN usuario u ON p.usuario_id = u.usuario_id
      WHERE r.nutricionista_id = ?
      ORDER BY r.fecha DESC, r.resena_id DESC
    `,
    [id]
  );

  return rows;
};

export const findPacientesVinculados = async (
  nutricionistaId: number,
  client: Pool | PoolConnection = pool
): Promise<PacienteVinculadoRow[]> => {
  const [rows] = await client.query<PacienteVinculadoRow[]>(
    `
      SELECT
        p.paciente_id,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        er.nombre AS estado_registro,
        p.fecha_invitacion,
        p.fecha_expiracion
      FROM relacion_paciente_profesional r
      JOIN paciente p ON r.paciente_id = p.paciente_id
      JOIN usuario u ON p.usuario_id = u.usuario_id
      LEFT JOIN estado_registro er ON p.estado_registro_id = er.estado_registro_id
      WHERE r.nutricionista_id = ?
      ORDER BY u.nombre, u.apellido
    `,
    [nutricionistaId]
  );

  return rows;
};
