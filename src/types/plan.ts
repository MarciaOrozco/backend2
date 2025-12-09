export type PlanOrigin = "manual" | "ia";
export type PlanStatus = "borrador" | "validado" | "enviado";

export const PLAN_STATUS: readonly PlanStatus[] = [
  "borrador",
  "validado",
  "enviado",
];

export const PLAN_ORIGINS: readonly PlanOrigin[] = ["manual", "ia"];

export const DEFAULT_MEAL_TYPES = [
  "Desayuno",
  "Media manana",
  "Almuerzo",
  "Merienda",
  "Cena",
  "Colacion",
];

export const DEFAULT_DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

export interface PlanFoodItem {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface PlanMeal {
  order: number;
  type: string;
  mealId?: number;
  dayId?: number;
  title?: string;
  description?: string;
  time?: string;
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  foods?: PlanFoodItem[];
  notes?: string;
}

export interface PlanDayTotals {
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  [key: string]: number | undefined;
}

export interface PlanDay {
  dayNumber: number;
  dayId?: number;
  planId?: number;
  name?: string;
  goal?: string;
  notes?: string;
  totals?: PlanDayTotals;
  meals: PlanMeal[];
}

export interface PlanMetadata {
  title?: string;
  notes?: string;
  origin?: PlanOrigin;
  patientInfo?: {
    age?: number;
    sex?: string;
    weight?: number;
    height?: number;
    activityLevel?: string;
  };
  objectives?: {
    primary?: string;
    secondary?: string;
    targetWeight?: number;
    timeframe?: string;
  };
  medicalConditions?: {
    conditions?: string[];
    notes?: string;
  };
  restrictions?: {
    allergies?: string[];
    dislikes?: string[];
    dietType?: string;
    other?: string;
  };
  preferences?: {
    likedFoods?: string[];
    dislikedFoods?: string[];
    notes?: string;
  };
}

export interface PlanRecord {
  planId: number;
  patientId: number;
  nutritionistId: number;
  status: PlanStatus;
  origin: PlanOrigin;
  title?: string;
  notes?: string;
  patientInfo?: PlanMetadata["patientInfo"];
  objectives?: PlanMetadata["objectives"];
  medicalConditions?: PlanMetadata["medicalConditions"];
  restrictions?: PlanMetadata["restrictions"];
  preferences?: PlanMetadata["preferences"];
  days: PlanDay[];
  createdAt: string | null;
  updatedAt: string | null;
  validatedAt?: string | null;
}

export interface CreatePlanPayload extends PlanMetadata {
  patientId: number;
  nutritionistId: number;
  days?: PlanDay[];
}

export interface UpdatePlanPayload extends Partial<PlanMetadata> {
  metadata?: PlanMetadata;
  days?: PlanDay[];
  status?: PlanStatus;
  origin?: PlanOrigin;
}

export type UpsertPlanPayload = UpdatePlanPayload;
