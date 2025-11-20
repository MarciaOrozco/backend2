import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { DomainError } from "../types/errors";
import type { CreateTurnoPayload } from "../types/turno";
import {
  ConsultaEvolucionRow,
  ConsultaRow,
  findConsultasByPaciente,
  findConsultaById,
  deleteConsultaById,
  findDocumentosByConsultaId,
  findEvolucionByPacienteId,
  findHistorialPeso,
  insertConsulta,
  insertDocumentoConsulta,
  updateConsultaById,
  type ConsultaListadoRow,
  type DocumentoConsultaRow,
  type HistorialPesoRow,
} from "../repositories/consultaRepository";
import { toDateISO } from "../utils/dateUtils";
import { assertVinculoActivo } from "../repositories/vinculoRepository";
import { crearTurnoInterno } from "./turnoService";
import { vincularPacienteProfesional } from "./vinculacionService";

const ALLOWED_ESTADOS = new Set(["borrador", "guardada", "cerrada"]);
const ALLOWED_VISIBILIDAD = new Set(["paciente", "profesional"]);
const DELETE_MOTIVES = new Set(["Error de carga", "Duplicada", "Otra"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

interface ContextoUsuario {
  rol: string;
  nutricionistaId?: number | null;
}

const resolveNutricionistaId = (context: ContextoUsuario): number | null => {
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

interface ListarConsultasPacienteContext {
  rolUsuario: string;
  nutricionistaId?: number | null;
}

export interface RegistroEvolucion {
  fecha_consulta: string | null;
  peso: number | null;
  imc: number | null;
  cintura: number | null;
  porcentaje_grasa: number | null;
  meta_peso: number | null;
}

/**
 * Lista consultas de un paciente.
 * - Paciente / admin: ven todas las consultas del paciente.
 * - Nutricionista: solo sus propias consultas (mismo filtro que tenías antes).
 */
export const listarConsultasPaciente = async (
  pacienteId: number,
  context: ListarConsultasPacienteContext
): Promise<ConsultaListadoRow[]> => {
  const { rolUsuario, nutricionistaId } = context;

  let filtroNutricionistaId: number | undefined;

  if (rolUsuario === "nutricionista") {
    if (!nutricionistaId) {
      throw new DomainError("Nutricionista no registrado", 403);
    }
    filtroNutricionistaId = nutricionistaId;
  } else {
    filtroNutricionistaId = undefined;
  }

  const consultas = await findConsultasByPaciente(
    undefined,
    pacienteId,
    filtroNutricionistaId
  );

  return consultas;
};

/**
 * Devuelve la evolución cruda del paciente (sin decidir el código HTTP).
 * El controller se encarga de status 204 vs 200.
 */
export const obtenerEvolucionPacienteService = async (
  pacienteId: number
): Promise<RegistroEvolucion[]> => {
  const rows = await findEvolucionByPacienteId(undefined, pacienteId);

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
  context: ContextoUsuario
): Promise<{ consultaId: number }> => {
  const nutricionistaId = resolveNutricionistaId(context);
  if (!nutricionistaId) {
    throw new DomainError("No autorizado", 403);
  }

  await assertVinculoActivo(pacienteId, nutricionistaId);

  const consultaId = await insertConsulta(undefined, pacienteId, nutricionistaId);

  return { consultaId };
};

export const obtenerConsultaService = async (
  consultaId: number,
  context: ContextoUsuario
) => {
  const consulta = await findConsultaById(undefined, consultaId);

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

  const documentos = await findDocumentosByConsultaId(undefined, consultaId);
  const historialPeso = await findHistorialPeso(
    undefined,
    consulta.paciente_id,
    nutricionistaId ?? consulta.nutricionista_id
  );

  return {
    ...consulta,
    fecha_consulta: toDateISO(consulta.fecha_consulta),
    documentos: documentos.map((doc: DocumentoConsultaRow) => ({
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
  context: ContextoUsuario
): Promise<void> => {
  const consulta = await findConsultaById(undefined, consultaId);
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

  await updateConsultaById(undefined, consultaId, payload);
};

export const eliminarConsultaService = async (
  consultaId: number,
  payload: { motivo?: string; detalle?: string },
  context: ContextoUsuario
): Promise<void> => {
  const { motivo, detalle } = payload ?? {};

  if (!DELETE_MOTIVES.has(motivo ?? "")) {
    throw new DomainError("Motivo de eliminación inválido", 422);
  }

  if (motivo === "Otra" && !detalle) {
    throw new DomainError(
      "Debe indicar un detalle para el motivo 'Otra'",
      422
    );
  }

  const consulta = await findConsultaById(undefined, consultaId);
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

  await deleteConsultaById(undefined, consultaId);
};

export interface DocumentoSubido {
  nombre: string;
  ruta: string;
}

export const subirDocumentosConsultaService = async (
  consultaId: number,
  files: Express.Multer.File[] | undefined,
  context: ContextoUsuario
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

  const consulta = await findConsultaById(undefined, consultaId);
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
    await insertDocumentoConsulta(undefined, {
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
  context: ContextoUsuario
): Promise<{ filePath: string; fileName: string }> => {
  const consulta = await findConsultaById(undefined, consultaId);
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

  const doc = new PDFDocument();
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const fileName = `consulta-${consultaId}-${Date.now()}.pdf`;
  const tempPath = path.join(uploadsDir, fileName);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const writeStream = fs.createWriteStream(tempPath);
  doc.pipe(writeStream);

  const incluirSeccion = (section: string) =>
    !secciones?.length || secciones.includes(section);

  doc.fontSize(18).text(`Consulta #${consultaId}`, { underline: true });
  doc.moveDown();

  if (incluirSeccion("informacion")) {
    doc.fontSize(14).text("Información", { underline: true });
    doc.fontSize(12).text(`Fecha: ${consulta.fecha_consulta}`);
    doc.fontSize(12).text(`Estado: ${consulta.estado}`);
    doc.moveDown();
  }

  if (incluirSeccion("motivo")) {
    doc.fontSize(14).text("Motivo", { underline: true });
    doc.fontSize(12).text(consulta.motivo ?? "-");
    doc.fontSize(12).text(`Antecedentes: ${consulta.antecedentes ?? "-"}`);
    doc.fontSize(12).text(`Objetivos: ${consulta.objetivos ?? "-"}`);
    doc.moveDown();
  }

  if (incluirSeccion("medidas")) {
    doc.fontSize(14).text("Medidas", { underline: true });
    doc.fontSize(12).text(`Peso: ${consulta.peso ?? "-"}`);
    doc.fontSize(12).text(`Altura: ${consulta.altura ?? "-"}`);
    doc.fontSize(12).text(`IMC: ${consulta.imc ?? "-"}`);
    doc.moveDown();
  }

  if (incluirSeccion("notas")) {
    doc.fontSize(14).text("Notas", { underline: true });
    doc.fontSize(12).text(`Resumen: ${consulta.resumen ?? "-"}`);
    doc.fontSize(12).text(`Diagnóstico: ${consulta.diagnostico ?? "-"}`);
    doc.fontSize(12).text(`Indicaciones: ${consulta.indicaciones ?? "-"}`);
    doc.moveDown();
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", (err) => reject(err));
  });

  return {
    filePath: tempPath,
    fileName: `consulta-${consultaId}.pdf`,
  };
};

export const programarProximaCitaService = async (
  consultaId: number,
  payload: {
    fecha: string;
    hora: string;
    modalidadId?: number | null;
    metodoPagoId?: number | null;
  },
  context: ContextoUsuario
): Promise<{ turnoId: number }> => {
  const { fecha, hora, modalidadId = null, metodoPagoId = null } = payload;

  if (!fecha || !hora) {
    throw new DomainError(
      "Fecha y hora son obligatorias para programar la cita",
      422
    );
  }

  const consulta = await findConsultaById(undefined, consultaId);
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

  const turnoId = await crearTurnoInterno(turnoPayload);
  await vincularPacienteProfesional(turnoId);

  return { turnoId };
};
