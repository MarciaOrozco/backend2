import { DomainError } from "../interfaces/errors";
import path from "path";
import type { CreateTurnoPayload } from "../interfaces/turno";
import { pool } from "../config/db";
import { toDateISO } from "../utils/dateUtils";
import { assertVinculoActivo } from "../repositories/vinculoRepository";
import { vincularPacienteProfesional } from "./vinculacionService";
import { ConsultaPdfExporter } from "./export/ConsultaPdfExporter";
import { createTurno } from "../repositories/turnoRepository";
import {
  ConsultaEvolucionRow,
  ConsultaListadoRow,
  ConsultaRow,
  HistorialPesoRow,
  RegistroEvolucion,
} from "../interfaces/consulta";
import {
  deleteConsultaById,
  findConsultaById,
  findConsultasByPaciente,
  findDocumentosByConsultaId,
  findEvolucionByPacienteId,
  findHistorialPeso,
  insertConsulta,
  insertDocumentoConsulta,
  updateConsultaById,
} from "../repositories/consultaRepository";
import { DocumentoRow, DocumentoSubido } from "../interfaces/documento";
import { ContextoBase } from "../interfaces/context";

const ALLOWED_ESTADOS = new Set(["borrador", "guardada", "cerrada"]);
const ALLOWED_VISIBILIDAD = new Set(["paciente", "profesional"]);
const DELETE_MOTIVES = new Set(["Error de carga", "Duplicada", "Otra"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const resolveNutricionistaId = (context: ContextoBase): number | null => {
  if (context.rol === "nutricionista") {
    if (!context.nutricionistaId) {
      throw new DomainError("Nutricionista no registrado", 403);
    }
    return context.nutricionistaId;
  }

  if (context.rol === "admin") {
    return null;
  }

  throw new DomainError("No autorizado", 403);
};

const computeImc = (peso?: any, altura?: any) => {
  const p = peso != null ? Number(peso) : undefined;
  const h = altura != null ? Number(altura) / 100 : undefined;
  if (!p || !h) return null;
  const value = p / (h * h);
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(2));
};

const buildUpdatePayload = (body: Record<string, any>, actual: ConsultaRow) => {
  const allowedFields = [
    "fecha_consulta",
    "estado",
    "motivo",
    "antecedentes",
    "objetivos",
    "peso",
    "altura",
    "imc",
    "cintura",
    "cadera",
    "porcentaje_grasa",
    "porcentaje_magra",
    "meta_peso",
    "meta_semanal",
    "observaciones_medidas",
    "resumen",
    "diagnostico",
    "indicaciones",
    "observaciones_internas",
    "visibilidad_notas",
  ];

  const payload: Record<string, any> = {};
  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  });

  if (payload.estado && !ALLOWED_ESTADOS.has(payload.estado)) {
    throw new DomainError("Estado de consulta inválido", 422);
  }

  if (
    payload.visibilidad_notas &&
    !ALLOWED_VISIBILIDAD.has(payload.visibilidad_notas)
  ) {
    throw new DomainError("Visibilidad de notas inválida", 422);
  }

  if (payload.fecha_consulta) {
    const fecha = new Date(payload.fecha_consulta);
    if (Number.isNaN(fecha.getTime())) {
      throw new DomainError("Fecha de consulta inválida", 422);
    }
    payload.fecha_consulta = fecha.toISOString().slice(0, 10);
  }

  const peso = payload.peso ?? actual.peso;
  const altura = payload.altura ?? actual.altura;
  const imc = computeImc(peso, altura);
  if (imc !== null) {
    payload.imc = imc;
  }

  return payload;
};

/**
 * Lista consultas de un paciente.
 * - Paciente / admin: ven todas las consultas del paciente.
 * - Nutricionista: solo sus propias consultas (mismo filtro que tenías antes).
 */
export const listarConsultasPaciente = async (
  pacienteId: number,
  context: ContextoBase
): Promise<ConsultaListadoRow[]> => {
  const { rol, nutricionistaId } = context;

  // Si es nutricionista, debe tener id; si no, error
  const filtroNutricionistaId =
    rol === "nutricionista"
      ? nutricionistaId ??
        (() => {
          throw new DomainError("Nutricionista no registrado", 403);
        })()
      : undefined;

  return findConsultasByPaciente(pool, pacienteId, filtroNutricionistaId);
};

/**
 * Devuelve la evolución cruda del paciente (sin decidir el código HTTP).
 * El controller se encarga de status 204 vs 200.
 */
export const obtenerEvolucionPacienteService = async (
  pacienteId: number
): Promise<RegistroEvolucion[]> => {
  const rows = await findEvolucionByPacienteId(pool, pacienteId);

  const registros: RegistroEvolucion[] = rows
    .map((row: ConsultaEvolucionRow) => ({
      fecha_consulta: toDateISO(row.fecha_consulta),
      peso: row.peso != null ? Number(row.peso) : null,
      imc: row.imc != null ? Number(row.imc) : null,
      cintura: row.cintura != null ? Number(row.cintura) : null,
      porcentaje_grasa:
        row.porcentaje_grasa != null ? Number(row.porcentaje_grasa) : null,
      meta_peso: row.meta_peso != null ? Number(row.meta_peso) : null,
    }))
    .filter((registro) => {
      if (!registro.fecha_consulta) return false;
      return [
        registro.peso,
        registro.imc,
        registro.cintura,
        registro.porcentaje_grasa,
      ].some((valor) => valor != null);
    });

  return registros;
};

export const crearConsultaService = async (
  pacienteId: number,
  context: ContextoBase
): Promise<{ consultaId: number }> => {
  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  await assertVinculoActivo(pacienteId, nutricionistaId);

  const consultaId = await insertConsulta(pool, pacienteId, nutricionistaId);

  return { consultaId };
};

export const obtenerConsultaService = async (
  consultaId: number,
  context: ContextoBase
) => {
  const consulta = await findConsultaById(pool, consultaId);

  if (!consulta) {
    throw new DomainError("Consulta no encontrada", 404);
  }

  const nutricionistaId = resolveNutricionistaId(context);

  if (
    nutricionistaId &&
    Number(consulta.nutricionista_id) !== Number(nutricionistaId)
  ) {
    await assertVinculoActivo(consulta.paciente_id, nutricionistaId);
  }

  const documentos = await findDocumentosByConsultaId(pool, consultaId);
  const historialPeso = await findHistorialPeso(
    pool,
    consulta.paciente_id,
    nutricionistaId ?? consulta.nutricionista_id
  );

  return {
    ...consulta,
    fecha_consulta: toDateISO(consulta.fecha_consulta),
    documentos: documentos.map((doc: DocumentoRow) => ({
      id: doc.documento_id,
      descripcion: doc.descripcion ?? doc.ruta_archivo,
      ruta: doc.ruta_archivo,
      fecha: toDateISO(doc.fecha),
    })),
    historial_peso: historialPeso.map((row: HistorialPesoRow) => ({
      fecha: toDateISO(row.fecha),
      peso: row.peso != null ? Number(row.peso) : null,
    })),
  };
};

export const actualizarConsultaService = async (
  consultaId: number,
  body: Record<string, any>,
  context: ContextoBase
): Promise<void> => {
  const consulta = await findConsultaById(pool, consultaId);
  if (!consulta) {
    throw new DomainError("Consulta no encontrada", 404);
  }

  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  if (Number(consulta.nutricionista_id) !== Number(nutricionistaId)) {
    await assertVinculoActivo(consulta.paciente_id, nutricionistaId);
  }

  const payload = buildUpdatePayload(body ?? {}, consulta);

  if (!Object.keys(payload).length) {
    throw new DomainError("No hay cambios para guardar", 422);
  }

  await updateConsultaById(pool, consultaId, payload);
};

export const eliminarConsultaService = async (
  consultaId: number,
  payload: { motivo?: string; detalle?: string },
  context: ContextoBase
): Promise<void> => {
  const { motivo, detalle } = payload ?? {};

  if (!DELETE_MOTIVES.has(motivo ?? "")) {
    throw new DomainError("Motivo de eliminación inválido", 422);
  }

  if (motivo === "Otra" && !detalle) {
    throw new DomainError("Debe indicar un detalle para el motivo 'Otra'", 422);
  }

  const consulta = await findConsultaById(pool, consultaId);
  if (!consulta) {
    throw new DomainError("Consulta no encontrada", 404);
  }

  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  if (Number(consulta.nutricionista_id) !== Number(nutricionistaId)) {
    await assertVinculoActivo(consulta.paciente_id, nutricionistaId);
  }

  await deleteConsultaById(pool, consultaId);
};

export const subirDocumentosConsultaService = async (
  consultaId: number,
  files: Express.Multer.File[] | undefined,
  context: ContextoBase
): Promise<DocumentoSubido[]> => {
  if (!files?.length) {
    throw new DomainError("Debes adjuntar al menos un archivo", 422);
  }

  const invalido = files.find(
    (file) =>
      !ALLOWED_MIME_TYPES.has(file.mimetype) || file.size > 5 * 1024 * 1024
  );

  if (invalido) {
    throw new DomainError(
      "Archivo inválido. Permitidos: PDF, JPG, PNG hasta 5MB",
      422
    );
  }

  const consulta = await findConsultaById(pool, consultaId);
  if (!consulta) {
    throw new DomainError("Consulta no encontrada", 404);
  }

  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  if (Number(consulta.nutricionista_id) !== Number(nutricionistaId)) {
    await assertVinculoActivo(consulta.paciente_id, nutricionistaId);
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const registros: DocumentoSubido[] = [];

  for (const file of files) {
    const rutaRelativa = path.relative(process.cwd(), file.path);
    await insertDocumentoConsulta(pool, {
      pacienteId: consulta.paciente_id,
      consultaId,
      descripcion: file.originalname,
      rutaArchivo: rutaRelativa,
      fecha,
    });
    registros.push({ nombre: file.originalname, ruta: rutaRelativa });
  }

  return registros;
};

export const exportarConsultaService = async (
  consultaId: number,
  secciones: string[] | undefined,
  context: ContextoBase
): Promise<{ filePath: string; fileName: string }> => {
  const consulta = await findConsultaById(pool, consultaId);
  if (!consulta) {
    throw new DomainError("Consulta no encontrada", 404);
  }

  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  if (Number(consulta.nutricionista_id) !== Number(nutricionistaId)) {
    await assertVinculoActivo(consulta.paciente_id, nutricionistaId);
  }

  const documentos = await findDocumentosByConsultaId(pool, consultaId);
  const historialPeso = await findHistorialPeso(
    pool,
    consulta.paciente_id,
    nutricionistaId ?? consulta.nutricionista_id
  );

  const exporter = new ConsultaPdfExporter();
  return exporter.export({
    consulta,
    documentos,
    historialPeso,
    secciones,
  });
};

export const programarProximaCitaService = async (
  consultaId: number,
  payload: {
    fecha: string;
    hora: string;
    modalidadId?: number | null;
    metodoPagoId?: number | null;
  },
  context: ContextoBase
): Promise<{ turnoId: number }> => {
  const { fecha, hora, modalidadId = null, metodoPagoId = null } = payload;

  if (!fecha || !hora) {
    throw new DomainError(
      "Fecha y hora son obligatorias para programar la cita",
      422
    );
  }

  const consulta = await findConsultaById(pool, consultaId);
  if (!consulta) {
    throw new DomainError("Consulta no encontrada", 404);
  }

  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  if (Number(consulta.nutricionista_id) !== Number(nutricionistaId)) {
    await assertVinculoActivo(consulta.paciente_id, nutricionistaId);
  }

  const turnoPayload: CreateTurnoPayload = {
    fecha,
    hora,
    pacienteId: consulta.paciente_id,
    nutricionistaId: nutricionistaId ?? consulta.nutricionista_id,
    modalidadId,
    metodoPagoId,
  };

  const turnoId = await createTurno(turnoPayload);
  await vincularPacienteProfesional(turnoId);

  return { turnoId };
};
