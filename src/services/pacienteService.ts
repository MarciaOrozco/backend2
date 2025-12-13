import { pool } from "../config/db";
import { DomainError } from "../interfaces/errors";
import {
  getDocumentosByPaciente,
  getPacienteContactoById,
  getPlanesByPaciente,
} from "../repositories/pacienteRepository";
import {
  DocumentoPaciente,
  PacienteContacto,
  PlanPacienteResumen,
} from "../interfaces/paciente";

const toDateString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

export const obtenerContactoPaciente = async (
  pacienteId: number
): Promise<PacienteContacto> => {
  const contacto = await getPacienteContactoById(pacienteId);

  if (!contacto) {
    throw new DomainError("Paciente no encontrado", 404);
  }

  return {
    pacienteId: contacto.paciente_id,
    nombre: contacto.nombre,
    apellido: contacto.apellido,
    email: contacto.email,
    telefono: contacto.telefono,
    ciudad: contacto.ciudad,
  };
};

export const listarDocumentosPaciente = async (
  pacienteId: number
): Promise<DocumentoPaciente[]> => {
  const documentos = await getDocumentosByPaciente(pool, pacienteId);

  return documentos.map((documento) => ({
    id: documento.documento_id,
    descripcion: documento.descripcion ?? documento.ruta_archivo,
    ruta: documento.ruta_archivo,
    fecha: toDateString(documento.fecha),
  }));
};

export const listarPlanesPaciente = async (
  pacienteId: number
): Promise<PlanPacienteResumen[]> => {
  const planes = await getPlanesByPaciente(pool, pacienteId);

  return planes.map((plan) => ({
    id: plan.plan_id,
    fechaCreacion: toDateString(plan.fecha_creacion),
    ultimaActualizacion: toDateString(plan.ultima_actualizacion),
    fechaValidacion: toDateString(plan.fecha_validacion),
    estado: plan.estado,
    origen: plan.origen,
    titulo: plan.titulo,
    notas: plan.notas,
  }));
};
