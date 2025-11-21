import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { pool } from "../config/db";
import {
  DEFAULT_DAY_NAMES,
  PLAN_STATUS,
  type PlanDay,
  type PlanDayTotals,
  type PlanMeal,
  type PlanMetadata,
  type PlanRecord,
  type PlanStatus,
  type PlanOrigin,
  type CreatePlanPayload,
  type UpsertPlanPayload,
} from "../types/plan";
import {
  findPlanRowById,
  findDayRowsByPlanId,
  findMealRowsByDayIds,
  insertPlanRow,
  insertDayRow,
  insertMealRow,
  deleteMealsByPlanId,
  deleteDaysByPlanId,
  updatePlanFields,
  markPlanStatus,
  deletePlanRowById,
} from "../repositories/planRepository";
import { assertVinculoActivo } from "../repositories/vinculoRepository";
import { DomainError } from "../types/errors";

interface PlanAccessContext {
  rol: string;
  pacienteId?: number | null;
  nutricionistaId?: number | null;
}

interface CreatePlanContext extends PlanAccessContext {
  usuarioId: number;
}

const parseNumber = (value: any): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseDate = (value: any): string => {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const parseJson = <T>(value: any, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch (_error) {
    return fallback;
  }
};

const serializeMetadata = (
  metadata: PlanMetadata,
  mode: "create" | "update" = "create"
) => {
  const patient = metadata.patientInfo;
  const objectives = metadata.objectives;

  const result: Record<string, any> = {};

  const assign = (
    key: string,
    value: unknown,
    { json = false }: { json?: boolean } = {}
  ) => {
    if (mode === "update" && value === undefined) return;

    if (json) {
      result[key] = value == null ? null : JSON.stringify(value);
      return;
    }

    result[key] = value ?? null;
  };

  assign("origen", metadata.origin);
  assign("titulo", metadata.title);
  assign("objetivo_principal", objectives?.primary);
  assign("objetivo_secundario", objectives?.secondary);
  assign("edad", patient?.age);
  assign("sexo", patient?.sex);
  assign("nivel_actividad", patient?.activityLevel);
  assign("peso_actual", patient?.weight);
  assign("peso_objetivo", objectives?.targetWeight);
  assign("altura", patient?.height);
  assign("tiempo_estimado", objectives?.timeframe);
  assign("condiciones_json", metadata.medicalConditions, { json: true });
  assign("restricciones_json", metadata.restrictions, { json: true });
  assign("preferencias_json", metadata.preferences, { json: true });
  assign("notas", metadata.notes);

  return result;
};

const extractKnownTotals = (
  totals: PlanDayTotals | undefined
): {
  total_calorias: number | null;
  total_proteinas: number | null;
  total_carbohidratos: number | null;
  total_grasas: number | null;
  extras_json: string | null;
} => {
  if (!totals) {
    return {
      total_calorias: null,
      total_proteinas: null,
      total_carbohidratos: null,
      total_grasas: null,
      extras_json: null,
    };
  }

  const { calories, proteins, carbs, fats, ...rest } = totals;

  return {
    total_calorias: calories ?? null,
    total_proteinas: proteins ?? null,
    total_carbohidratos: carbs ?? null,
    total_grasas: fats ?? null,
    extras_json: Object.keys(rest).length ? JSON.stringify(rest) : null,
  };
};

const serializeMeal = (meal: PlanMeal, dayId: number) => ({
  dia_plan_id: dayId,
  orden: meal.order ?? null,
  tipo_comida: meal.type ?? null,
  titulo: meal.title ?? null,
  descripcion: meal.description ?? null,
  horario: meal.time ? meal.time : null,
  calorias: meal.calories ?? null,
  proteinas: meal.proteins ?? null,
  carbohidratos: meal.carbs ?? null,
  grasas: meal.fats ?? null,
  fibra: meal.fiber ?? null,
  alimentos_json:
    meal.foods && meal.foods.length ? JSON.stringify(meal.foods) : null,
  observaciones: meal.notes ?? null,
});

const mealRowToMeal = (row: any): PlanMeal => ({
  mealId: row.comida_id,
  dayId: row.dia_plan_id,
  order: row.orden ?? 0,
  type: row.tipo_comida ?? "",
  title: row.titulo ?? undefined,
  description: row.descripcion ?? undefined,
  time: row.horario ?? undefined,
  calories: parseNumber(row.calorias),
  proteins: parseNumber(row.proteinas),
  carbs: parseNumber(row.carbohidratos),
  fats: parseNumber(row.grasas),
  fiber: parseNumber(row.fibra),
  foods: parseJson(row.alimentos_json, []) ?? [],
  notes: row.observaciones ?? undefined,
});

const dayRowToDay = (row: any, meals: any[]): PlanDay => {
  const filteredMeals = meals.filter(
    (meal) => Number(meal.dia_plan_id) === Number(row.dia_plan_id)
  );

  const extras = parseJson<Record<string, number>>(row.extras_json, {});

  const totals: PlanDayTotals = {
    calories: parseNumber(row.total_calorias),
    proteins: parseNumber(row.total_proteinas),
    carbs: parseNumber(row.total_carbohidratos),
    fats: parseNumber(row.total_grasas),
    ...extras,
  };

  return {
    dayId: row.dia_plan_id,
    planId: row.plan_id,
    dayNumber: row.numero_dia,
    name: row.nombre ?? undefined,
    goal: row.objetivo ?? undefined,
    notes: row.notas ?? undefined,
    totals,
    meals: filteredMeals.map(mealRowToMeal),
  };
};

const planRowToRecord = async (row: any): Promise<PlanRecord> => {
  const dayRows = await findDayRowsByPlanId(pool, row.plan_id);

  let mealRows: any[] = [];
  if (dayRows.length) {
    const dayIds = dayRows.map((day) => day.dia_plan_id);
    mealRows = await findMealRowsByDayIds(pool, dayIds);
  }

  const medical = parseJson(row.condiciones_json, { conditions: [] });
  const restrictions = parseJson(row.restricciones_json, { allergies: [] });
  const preferences = parseJson(row.preferencias_json, {});

  return {
    planId: row.plan_id,
    patientId: row.paciente_id,
    nutritionistId: row.nutricionista_id,
    status: row.estado,
    origin: row.origen,
    title: row.titulo ?? undefined,
    notes: row.notas ?? undefined,
    createdAt: parseDate(row.fecha_creacion),
    updatedAt: parseDate(row.ultima_actualizacion),
    validatedAt: row.fecha_validacion ? parseDate(row.fecha_validacion) : null,
    patientInfo: {
      age: parseNumber(row.edad),
      sex: row.sexo ?? undefined,
      weight: parseNumber(row.peso_actual),
      height: parseNumber(row.altura),
      activityLevel: row.nivel_actividad ?? undefined,
    },
    objectives: {
      primary: row.objetivo_principal ?? undefined,
      secondary: row.objetivo_secundario ?? undefined,
      targetWeight: parseNumber(row.peso_objetivo),
      timeframe: row.tiempo_estimado ?? undefined,
    },
    medicalConditions: medical,
    restrictions,
    preferences,
    days: dayRows.map((day) => dayRowToDay(day, mealRows)),
  };
};

const insertDaysAndMeals = async (
  connection: PoolConnection,
  planId: number,
  days: PlanDay[]
) => {
  for (const day of days) {
    const totals = extractKnownTotals(day.totals);
    const dayId = await insertDayRow(connection, planId, day, totals);

    if (day.meals?.length) {
      for (const meal of day.meals) {
        await insertMealRow(connection, dayId, meal);
      }
    }
  }
};

const buildBlankWeek = (): PlanDay[] =>
  DEFAULT_DAY_NAMES.map((name, index) => ({
    dayNumber: index + 1,
    name,
    meals: [],
  }));

const createPlanInternal = async (
  payload: CreatePlanPayload & { origin: PlanOrigin }
): Promise<PlanRecord> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const serialized = serializeMetadata(payload);

    const planId = await insertPlanRow(connection, {
      paciente_id: payload.patientId,
      nutricionista_id: payload.nutritionistId,
      estado: "borrador",
      ...serialized,
    });

    const days =
      payload.days && payload.days.length ? payload.days : buildBlankWeek();

    await insertDaysAndMeals(connection, planId, days);

    await connection.commit();

    const planRow = await findPlanRowById(connection, planId);
    if (!planRow) throw new DomainError("Plan alimentario no encontrado", 404);
    return planRowToRecord(planRow);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const buildAiDraftMeals = (metadata: PlanMetadata): PlanDay[] => {
  const objectives = metadata.objectives?.primary
    ? metadata.objectives.primary
    : "equilibrio nutricional";
  const caloriesBase =
    metadata.patientInfo?.activityLevel === "Alta" ? 2200 : 1800;

  return DEFAULT_DAY_NAMES.map((name, index) => {
    const meals: PlanMeal[] = [
      {
        order: 1,
        type: "Desayuno",
        title: "Inicio energético",
        description:
          "Avena cocida con leche vegetal, frutos rojos y semillas de chia.",
        calories: 350,
        proteins: 12,
        carbs: 48,
        fats: 10,
      },
      {
        order: 2,
        type: "Almuerzo",
        title: "Plato principal balanceado",
        description: "",
        calories: 550,
        proteins: 45,
        carbs: 50,
        fats: 18,
      },
      {
        order: 3,
        type: "Merienda",
        title: "Colacion ligera",
        description: "Yogur natural con nueces y una pieza de fruta.",
        calories: 250,
        proteins: 12,
        carbs: 24,
        fats: 12,
      },
      {
        order: 4,
        type: "Cena",
        title: "Cena reparadora",
        description: "Sopa de calabaza, tortilla de vegetales y pan integral.",
        calories: 480,
        proteins: 20,
        carbs: 52,
        fats: 16,
      },
    ];

    return {
      dayNumber: index + 1,
      name,
      goal: `Enfasis en ${objectives}`,
      totals: {
        calories: caloriesBase,
        proteins: meals.reduce((sum, meal) => sum + (meal.proteins ?? 0), 0),
        carbs: meals.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0),
        fats: meals.reduce((sum, meal) => sum + (meal.fats ?? 0), 0),
      },
      meals,
    };
  });
};

export const createManualPlan = async (
  body: any,
  context: CreatePlanContext
): Promise<PlanRecord> => {
  const pacienteId =
    Number.parseInt(body?.pacienteId ?? body?.patientId, 10) || null;
  if (!pacienteId) {
    throw new DomainError("pacienteId invalido", 422);
  }

  if (context.rol !== "nutricionista" && context.rol !== "admin") {
    throw new DomainError("Solo disponible para nutricionistas", 403);
  }

  const nutricionistaId =
    context.rol === "nutricionista"
      ? context.nutricionistaId
      : body?.nutricionistaId ?? context.nutricionistaId;

  if (!nutricionistaId) {
    throw new DomainError("Nutricionista no registrado", 403);
  }

  await assertVinculoActivo(pacienteId, nutricionistaId);

  const metadata: PlanMetadata = (body?.metadata ?? {}) as PlanMetadata;
  const days: PlanDay[] = Array.isArray(body?.days) ? body.days : [];

  const payload: CreatePlanPayload = {
    patientId: pacienteId,
    nutritionistId: Number(nutricionistaId),
    days,
    ...metadata,
  };

  return createPlanInternal({
    ...payload,
    origin: "manual",
  });
};

export const createAiPlan = async (
  body: any,
  context: CreatePlanContext
): Promise<PlanRecord> => {
  const pacienteId =
    Number.parseInt(body?.pacienteId ?? body?.patientId, 10) || null;
  if (!pacienteId) {
    throw new DomainError("pacienteId invalido", 422);
  }

  if (context.rol !== "nutricionista" && context.rol !== "admin") {
    throw new DomainError("Solo disponible para nutricionistas", 403);
  }

  const nutricionistaId =
    context.rol === "nutricionista"
      ? context.nutricionistaId
      : body?.nutricionistaId ?? context.nutricionistaId;

  if (!nutricionistaId) {
    throw new DomainError("Nutricionista no registrado", 403);
  }

  await assertVinculoActivo(pacienteId, nutricionistaId);

  const metadata: PlanMetadata = (body?.metadata ?? {}) as PlanMetadata;
  const days: PlanDay[] = Array.isArray(body?.days) ? body.days : [];
  const payload: CreatePlanPayload = {
    patientId: pacienteId,
    nutritionistId: Number(nutricionistaId),
    days: days.length ? days : buildAiDraftMeals(metadata),
    ...metadata,
  };

  return createPlanInternal({
    ...payload,
    origin: "ia",
  });
};

const ensurePlanAccess = (plan: PlanRecord, context: PlanAccessContext) => {
  const { rol, pacienteId, nutricionistaId } = context;

  if (rol === "admin") return;

  if (rol === "nutricionista") {
    if (
      !nutricionistaId ||
      Number(nutricionistaId) !== Number(plan.nutritionistId)
    ) {
      throw new DomainError("No autorizado para este plan alimentario", 403);
    }
    return;
  }

  if (rol === "paciente") {
    if (!pacienteId || Number(pacienteId) !== Number(plan.patientId)) {
      throw new DomainError("No autorizado para este plan alimentario", 403);
    }
    return;
  }

  throw new DomainError("No autorizado", 403);
};

export const getPlanById = async (
  planId: number,
  context: PlanAccessContext
): Promise<PlanRecord> => {
  const row = await findPlanRowById(pool, planId);
  if (!row) {
    throw new DomainError("Plan alimentario no encontrado", 404);
  }

  const plan = await planRowToRecord(row);
  ensurePlanAccess(plan, context);
  return plan;
};

export const updatePlan = async (
  planId: number,
  body: any,
  context: PlanAccessContext
): Promise<PlanRecord> => {
  const current = await getPlanById(planId, context);

  if (context.rol !== "nutricionista" && context.rol !== "admin") {
    throw new DomainError("Solo el nutricionista puede editar el plan", 403);
  }

  const updates: UpsertPlanPayload = {
    metadata: body?.metadata,
    days: Array.isArray(body?.days) ? body.days : undefined,
    status: body?.status,
  };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const fields: Record<string, any> = {
      ultima_actualizacion: new Date(),
    };

    if (updates.metadata) {
      const serialized = serializeMetadata(
        {
          ...updates.metadata,
          origin: updates.metadata.origin,
        },
        "update"
      );
      Object.assign(fields, serialized);
    }

    if (updates.status) {
      if (!PLAN_STATUS.includes(updates.status)) {
        throw new DomainError("Estado de plan inválido", 422);
      }
      fields.estado = updates.status;
      if (updates.status === "validado" || updates.status === "enviado") {
        fields.fecha_validacion = new Date();
      }
    }

    if (Object.keys(fields).length) {
      await updatePlanFields(connection, planId, fields);
    }

    if (updates.days) {
      await deleteMealsByPlanId(connection, planId);
      await deleteDaysByPlanId(connection, planId);
      const daysToInsert =
        updates.days.length > 0 ? updates.days : buildBlankWeek();
      await insertDaysAndMeals(connection, planId, daysToInsert);
    }

    await connection.commit();

    return getPlanById(planId, context);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const markPlanAsValidated = async (
  planId: number,
  status: Exclude<PlanStatus, "borrador"> = "validado",
  context?: PlanAccessContext
): Promise<PlanRecord> => {
  if (!PLAN_STATUS.includes(status)) {
    throw new DomainError("Estado de plan inválido", 422);
  }

  if (context) {
    const plan = await getPlanById(planId, context);
    if (context.rol !== "nutricionista" && context.rol !== "admin") {
      throw new DomainError("Solo el nutricionista puede validar el plan", 403);
    }
    ensurePlanAccess(plan, context);
  }

  await markPlanStatus(pool, planId, status, true);

  return getPlanById(planId, context ?? { rol: "admin" });
};

const formatDate = (value: string | undefined | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
};

export const exportarPlan = async (
  planId: number,
  context: PlanAccessContext
): Promise<{ filePath: string; fileName: string }> => {
  const plan = await getPlanById(planId, context);

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  await fs.promises.mkdir(uploadsDir, { recursive: true });
  const tempPath = path.join(uploadsDir, `plan-${planId}-${Date.now()}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(tempPath);
  doc.pipe(writeStream);

  doc.fontSize(20).text(`Plan alimentario #${plan.planId}`, {
    align: "center",
  });
  doc.moveDown();

  doc
    .fontSize(12)
    .text(
      `Estado: ${plan.status.toUpperCase()} | Origen: ${
        plan.origin?.toUpperCase() ?? "MANUAL"
      }`
    );
  doc.text(`Fecha de creacion: ${formatDate(plan.createdAt)}`);
  doc.text(`Ultima actualizacion: ${formatDate(plan.updatedAt)}`);
  doc.moveDown();

  doc.fontSize(14).text("Paciente", { underline: true });
  doc.fontSize(12).text(`ID Paciente: ${plan.patientId}`);
  doc.moveDown(0.5);

  doc.fontSize(14).text("Nutricionista", { underline: true });
  doc.fontSize(12).text(`ID Nutricionista: ${plan.nutritionistId}`);
  doc.moveDown();

  if (plan.patientInfo) {
    const info = plan.patientInfo;
    doc.fontSize(14).text("Datos del paciente", { underline: true });
    if (info.age) doc.text(`Edad: ${info.age}`);
    if (info.sex) doc.text(`Sexo: ${info.sex}`);
    if (info.weight) doc.text(`Peso: ${info.weight} kg`);
    if (info.height) doc.text(`Altura: ${info.height} cm`);
    if (info.activityLevel)
      doc.text(`Nivel de actividad: ${info.activityLevel}`);
    doc.moveDown();
  }

  if (plan.objectives) {
    const objectives = plan.objectives;
    doc.fontSize(14).text("Objetivos", { underline: true });
    if (objectives.primary) doc.text(`Principal: ${objectives.primary}`);
    if (objectives.secondary) doc.text(`Secundario: ${objectives.secondary}`);
    if (objectives.targetWeight)
      doc.text(`Peso objetivo: ${objectives.targetWeight} kg`);
    if (objectives.timeframe) doc.text(`Tiempo estimado: ${objectives.timeframe}`);
    doc.moveDown();
  }

  if (
    plan.medicalConditions?.conditions?.length ||
    plan.medicalConditions?.notes
  ) {
    doc.fontSize(14).text("Condiciones medicas", { underline: true });
    if (plan.medicalConditions?.conditions?.length) {
      doc.text(
        `Lista: ${plan.medicalConditions.conditions.join(", ")}`
      );
    }
    if (plan.medicalConditions?.notes) {
      doc.text(`Notas: ${plan.medicalConditions.notes}`);
    }
    doc.moveDown();
  }

  if (
    plan.restrictions?.allergies?.length ||
    plan.restrictions?.dislikes?.length ||
    plan.restrictions?.dietType ||
    plan.restrictions?.other
  ) {
    doc.fontSize(14).text("Restricciones y preferencias", {
      underline: true,
    });
    if (plan.restrictions?.dietType) {
      doc.text(`Tipo de dieta: ${plan.restrictions.dietType}`);
    }
    if (plan.restrictions?.allergies?.length) {
      doc.text(
        `Alergias: ${plan.restrictions.allergies.join(", ")}`
      );
    }
    if (plan.restrictions?.dislikes?.length) {
      doc.text(
        `No le agradan: ${plan.restrictions.dislikes.join(", ")}`
      );
    }
    if (plan.restrictions?.other) {
      doc.text(`Otras indicaciones: ${plan.restrictions.other}`);
    }
    doc.moveDown();
  }

  if (plan.notes) {
    doc.fontSize(14).text("Notas generales", { underline: true });
    doc.fontSize(12).text(plan.notes);
    doc.moveDown();
  }

  doc.fontSize(16).text("Plan semanal", { underline: true });
  doc.moveDown();

  (plan.days ?? []).forEach((day) => {
    doc.fontSize(14).text(day.name ?? `Dia ${day.dayNumber}`, {
      underline: true,
    });
    if (day.goal) {
      doc.fontSize(12).text(`Objetivo del dia: ${day.goal}`);
    }
    if (day.totals) {
      const totalsEntries = Object.entries(day.totals).filter(
        ([_, value]) => value !== undefined && value !== null
      );
      if (totalsEntries.length) {
        doc
          .fontSize(12)
          .text(
            `Totales: ${totalsEntries
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ")}`
          );
      }
    }
    doc.moveDown(0.5);

    if (!day.meals.length) {
      doc.fontSize(12).text("- Sin comidas registradas");
      doc.moveDown();
      return;
    }

    day.meals.forEach((meal) => {
      doc.fontSize(12).text(`• ${meal.type}`);
      if (meal.title) doc.text(`  Titulo: ${meal.title}`);
      if (meal.time) doc.text(`  Hora: ${meal.time}`);
      if (meal.description) doc.text(`  Detalle: ${meal.description}`);

      const nutrients = [
        meal.calories ? `Calorias: ${meal.calories}` : null,
        meal.proteins ? `Proteinas: ${meal.proteins}` : null,
        meal.carbs ? `Carbohidratos: ${meal.carbs}` : null,
        meal.fats ? `Grasas: ${meal.fats}` : null,
        meal.fiber ? `Fibra: ${meal.fiber}` : null,
      ].filter(Boolean);
      if (nutrients.length) {
        doc.text(`  Nutrientes: ${nutrients.join(" | ")}`);
      }

      if (meal.foods?.length) {
        doc.text(
          `  Alimentos: ${meal.foods
            .map((food) =>
              food.quantity
                ? `${food.name} (${food.quantity}${food.unit ? ` ${food.unit}` : ""})`
                : food.name
            )
            .join(", ")}`
        );
      }

      if (meal.notes) {
        doc.text(`  Observaciones: ${meal.notes}`);
      }

      doc.moveDown(0.5);
    });

    if (day.notes) {
      doc.text(`Notas del dia: ${day.notes}`);
    }

    doc.moveDown();
  });

  doc.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", (err) => reject(err));
  });

  return {
    filePath: tempPath,
    fileName: `plan-${planId}.pdf`,
  };
};

export const eliminarPlan = async (
  planId: number,
  context: PlanAccessContext
): Promise<void> => {
  const plan = await getPlanById(planId, context);

  if (context.rol !== "nutricionista" && context.rol !== "admin") {
    throw new DomainError("Solo el nutricionista puede eliminar el plan", 403);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await deleteMealsByPlanId(connection, planId);
    await deleteDaysByPlanId(connection, planId);
    await deletePlanRowById(connection, planId);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
