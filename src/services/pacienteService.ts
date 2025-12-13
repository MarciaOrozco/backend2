import { pool } from "../config/db";
import { DomainError } from "../interfaces/errors";
import {
  getDocumentosByPaciente,
  getPacienteContactoById,
  getPlanesByPaciente,
} from "../repositories/pacienteRepository";
import { PacienteContacto, PlanPacienteResumen } from "../interfaces/paciente";
import { toISODateString } from "../utils/dateUtils";
import { DocumentoPaciente } from "../interfaces/documento";

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
    fecha: toISODateString(documento.fecha),
  }));
};

export const listarPlanesPaciente = async (
  pacienteId: number
): Promise<PlanPacienteResumen[]> => {
  const planes = await getPlanesByPaciente(pool, pacienteId);

  return planes.map((plan) => ({
    id: plan.plan_id,
    fechaCreacion: toISODateString(plan.fecha_creacion),
    ultimaActualizacion: toISODateString(plan.ultima_actualizacion),
    fechaValidacion: toISODateString(plan.fecha_validacion),
    estado: plan.estado,
    origen: plan.origen,
    titulo: plan.titulo,
    notas: plan.notas,
  }));
};
