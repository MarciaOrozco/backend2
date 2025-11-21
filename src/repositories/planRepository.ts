import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "../config/db";
import type {
  PlanDay,
  PlanMeal,
  PlanMetadata,
  PlanOrigin,
  PlanStatus,
} from "../types/plan";

export interface PlanRow extends RowDataPacket {
  plan_id: number;
  paciente_id: number;
  nutricionista_id: number;
  origen: PlanOrigin;
  estado: PlanStatus;
  fecha_creacion: Date | string;
  ultima_actualizacion: Date | string | null;
  fecha_validacion: Date | string | null;
  titulo: string | null;
  objetivo_principal: string | null;
  objetivo_secundario: string | null;
  edad: number | null;
  sexo: string | null;
  nivel_actividad: string | null;
  peso_actual: number | null;
  peso_objetivo: number | null;
  altura: number | null;
  tiempo_estimado: string | null;
  condiciones_json: string | null;
  restricciones_json: string | null;
  preferencias_json: string | null;
  notas: string | null;
}

export interface DayRow extends RowDataPacket {
  dia_plan_id: number;
  plan_id: number;
  numero_dia: number;
  nombre: string | null;
  objetivo: string | null;
  total_calorias: number | null;
  total_proteinas: number | null;
  total_carbohidratos: number | null;
  total_grasas: number | null;
  extras_json: string | null;
  notas: string | null;
}

export interface MealRow extends RowDataPacket {
  comida_id: number;
  dia_plan_id: number;
  orden: number | null;
  tipo_comida: string | null;
  titulo: string | null;
  descripcion: string | null;
  horario: string | null;
  calorias: number | null;
  proteinas: number | null;
  carbohidratos: number | null;
  grasas: number | null;
  fibra: number | null;
  alimentos_json: string | null;
  observaciones: string | null;
}

export const findPlanRowById = async (
  client: Pool | PoolConnection = pool,
  planId: number
): Promise<PlanRow | null> => {
  const [rows] = await client.query<PlanRow[]>(
    `
      SELECT *
      FROM plan_alimentario
      WHERE plan_id = ?
      LIMIT 1
    `,
    [planId]
  );

  return rows[0] ?? null;
};

export const findDayRowsByPlanId = async (
  client: Pool | PoolConnection = pool,
  planId: number
): Promise<DayRow[]> => {
  const [rows] = await client.query<DayRow[]>(
    `
      SELECT *
      FROM dia_plan
      WHERE plan_id = ?
      ORDER BY numero_dia ASC, dia_plan_id ASC
    `,
    [planId]
  );

  return rows;
};

export const findMealRowsByDayIds = async (
  client: Pool | PoolConnection = pool,
  dayIds: number[]
): Promise<MealRow[]> => {
  if (!dayIds.length) return [];

  const placeholders = dayIds.map(() => "?").join(", ");
  const [rows] = await client.query<MealRow[]>(
    `
      SELECT *
      FROM comida
      WHERE dia_plan_id IN (${placeholders})
      ORDER BY dia_plan_id ASC, orden ASC, comida_id ASC
    `,
    dayIds
  );

  return rows;
};

export const insertPlanRow = async (
  client: Pool | PoolConnection = pool,
  fields: Record<string, any>
): Promise<number> => {
  const [result] = await client.query<ResultSetHeader>(
    `
      INSERT INTO plan_alimentario SET ?
    `,
    [fields]
  );

  return Number(result.insertId);
};

export const insertDayRow = async (
  client: Pool | PoolConnection = pool,
  planId: number,
  day: PlanDay,
  totals: {
    total_calorias: number | null;
    total_proteinas: number | null;
    total_carbohidratos: number | null;
    total_grasas: number | null;
    extras_json: string | null;
  }
): Promise<number> => {
  const [result] = await client.query<ResultSetHeader>(
    `
      INSERT INTO dia_plan
        (plan_id, numero_dia, nombre, objetivo, total_calorias, total_proteinas,
         total_carbohidratos, total_grasas, extras_json, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      planId,
      day.dayNumber,
      day.name ?? null,
      day.goal ?? null,
      totals.total_calorias,
      totals.total_proteinas,
      totals.total_carbohidratos,
      totals.total_grasas,
      totals.extras_json,
      day.notes ?? null,
    ]
  );

  return Number(result.insertId);
};

export const insertMealRow = async (
  client: Pool | PoolConnection = pool,
  dayId: number,
  meal: PlanMeal
): Promise<void> => {
  await client.query(
    `
      INSERT INTO comida
        (dia_plan_id, orden, tipo_comida, titulo, descripcion, horario, calorias,
         proteinas, carbohidratos, grasas, fibra, alimentos_json, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      dayId,
      meal.order ?? null,
      meal.type ?? null,
      meal.title ?? null,
      meal.description ?? null,
      meal.time ?? null,
      meal.calories ?? null,
      meal.proteins ?? null,
      meal.carbs ?? null,
      meal.fats ?? null,
      meal.fiber ?? null,
      meal.foods && meal.foods.length ? JSON.stringify(meal.foods) : null,
      meal.notes ?? null,
    ]
  );
};

export const deleteMealsByPlanId = async (
  client: Pool | PoolConnection = pool,
  planId: number
): Promise<void> => {
  await client.query(
    `
      DELETE FROM comida
      WHERE dia_plan_id IN (SELECT dia_plan_id FROM dia_plan WHERE plan_id = ?)
    `,
    [planId]
  );
};

export const deleteDaysByPlanId = async (
  client: Pool | PoolConnection = pool,
  planId: number
): Promise<void> => {
  await client.query(`DELETE FROM dia_plan WHERE plan_id = ?`, [planId]);
};

export const deletePlanRowById = async (
  client: Pool | PoolConnection = pool,
  planId: number
): Promise<void> => {
  await client.query(`DELETE FROM plan_alimentario WHERE plan_id = ?`, [
    planId,
  ]);
};

export const updatePlanFields = async (
  client: Pool | PoolConnection = pool,
  planId: number,
  fields: Record<string, any>
): Promise<void> => {
  await client.query(`UPDATE plan_alimentario SET ? WHERE plan_id = ?`, [
    fields,
    planId,
  ]);
};

export const markPlanStatus = async (
  client: Pool | PoolConnection = pool,
  planId: number,
  status: PlanStatus,
  setValidatedAt: boolean
): Promise<void> => {
  await client.query(
    `
      UPDATE plan_alimentario
      SET estado = ?, fecha_validacion = ?, ultima_actualizacion = NOW()
      WHERE plan_id = ?
    `,
    [status, setValidatedAt ? new Date() : null, planId]
  );
};
