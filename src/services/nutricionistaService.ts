import type {
  NutricionistaFilters,
  NutricionistaCardDTO,
  NutricionistaDetalleDTO,
} from "../types/nutricionista";
import {
  findNutricionistaBaseById,
  findEspecialidadesByNutricionista,
  findModalidadesByNutricionista,
  findEducacionByNutricionista,
  findMetodosPagoByNutricionista,
  findObrasSocialesByNutricionista,
  findResenasByNutricionista,
  findNutricionistas,
  findPacientesVinculados,
} from "../repositories/nutricionistaRepository";
import { findTurnosActivosByNutricionista } from "../repositories/turnoRepository";
import { toDateISO } from "../utils/dateUtils";
import { ensureNutricionistaPropietario } from "../utils/vinculoUtils";
import { DomainError } from "../types/errors";
import { assertVinculoActivo } from "../repositories/vinculoRepository";
import {
  crearPacienteManual,
  getPacienteContactoById,
} from "../repositories/pacienteRepository";
import { parseDbCsv, validateAndNormalizeEmail } from "../utils/stringUtils";
import { generateInvitationToken } from "../utils/tokenUtils";
import { enviarInvitacionRegistroPaciente } from "./notificacionService";
import { AgregarPacienteManualContext } from "../types/paciente";

export const getNutricionistas = async (
  filters: NutricionistaFilters
): Promise<NutricionistaCardDTO[]> => {
  const rows = await findNutricionistas(filters);

  return rows.map((row) => ({
    nutricionista_id: row.nutricionista_id,
    nombreCompleto: `${row.nombre ?? ""} ${row.apellido ?? ""}`.trim(),
    titulo: row.sobre_mi,
    reputacionPromedio: Number(row.reputacion_promedio ?? 0),
    totalOpiniones: Number(row.totalOpiniones ?? 0),
    especialidades: parseDbCsv(row.especialidades),
    modalidades: parseDbCsv(row.modalidades),
  }));
};

export const getNutricionistaById = async (
  id: number
): Promise<NutricionistaDetalleDTO | null> => {
  const base = await findNutricionistaBaseById(id);
  if (!base) {
    return null;
  }

  const [
    especialidades,
    modalidades,
    educacion,
    metodosPago,
    obrasSociales,
    resenasRaw,
  ] = await Promise.all([
    findEspecialidadesByNutricionista(id),
    findModalidadesByNutricionista(id),
    findEducacionByNutricionista(id),
    findMetodosPagoByNutricionista(id),
    findObrasSocialesByNutricionista(id),
    findResenasByNutricionista(id),
  ]);

  const resenas = resenasRaw.map((r) => ({
    resena_id: r.resena_id,
    fecha: r.fecha,
    comentario: r.comentario,
    puntuacion: r.puntuacion,
    paciente: `${r.paciente_nombre ?? ""} ${r.paciente_apellido ?? ""}`
      .trim()
      .replace(/\s+/g, " ")
      .trim(),
  }));

  return {
    nutricionista_id: base.nutricionista_id,
    nombre: base.nombre,
    apellido: base.apellido,
    email: base.email,

    sobre_mi: base.sobre_mi,
    reputacion_promedio: base.reputacion_promedio,

    especialidades,
    modalidades,
    educacion,
    metodosPago,
    obrasSociales,

    resenas,
    totalOpiniones: resenas.length,
  };
};

export const getPacientesVinculados = async (
  nutricionistaId: number,
  context: {
    userId: number;
    userRol: string;
    userNutricionistaId: number;
  }
) => {
  await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId
  );

  const rows = await findPacientesVinculados(nutricionistaId);

  return rows.map((row) => {
    const estado = row.estado_registro
      ? String(row.estado_registro).toLowerCase()
      : null;
    const estadoLabel = estado
      ? estado === "pendiente"
        ? "No registrado"
        : estado.charAt(0).toUpperCase() + estado.slice(1)
      : null;

    return {
      pacienteId: row.paciente_id,
      nombre: row.nombre,
      apellido: row.apellido,
      email: row.email,
      telefono: row.telefono,
      estadoRegistro: estado,
      estadoRegistroLabel: estadoLabel,
      fechaInvitacion: toDateISO(row.fecha_invitacion),
      fechaExpiracion: toDateISO(row.fecha_expiracion),
      esInvitado: estado === "pendiente",
    };
  });
};

export const getTurnosNutricionista = async (
  nutricionistaId: number,
  context: {
    userId: number;
    userRol: string;
    userNutricionistaId?: number | null;
  }
) => {
  await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? nutricionistaId
  );

  const rows = await findTurnosActivosByNutricionista(nutricionistaId);

  const now = new Date();
  const turnos = rows
    .map((row) => ({
      id: row.turno_id,
      fecha: toDateISO(row.fecha),
      hora: row.hora ? row.hora.toString().slice(0, 5) : null,
      estadoId: row.estado_turno_id,
      estado: row.estado,
      modalidadId: row.modalidad_id,
      modalidad: row.modalidad,
      paciente: {
        id: row.paciente_id,
        nombre: row.paciente_nombre,
        apellido: row.paciente_apellido,
        email: row.paciente_email,
      },
    }))
    .filter((turno) => {
      if (!turno.fecha) return false;
      const date = new Date(`${turno.fecha}T${turno.hora ?? "00:00"}`);
      if (Number.isNaN(date.getTime())) return false;
      return date.getTime() >= now.getTime();
    });

  return turnos;
};

export const getPacientePerfilParaNutricionista = async (
  nutricionistaId: number,
  pacienteId: number,
  context: {
    userId: number;
    userRol: string;
    userNutricionistaId?: number | null;
  }
) => {
  await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? nutricionistaId
  );

  await assertVinculoActivo(pacienteId, nutricionistaId);

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

export const agregarPacienteManual = async (
  nutricionistaId: number,
  payload: { nombre: string; apellido: string; email: string },
  context: AgregarPacienteManualContext
) => {
  await ensureNutricionistaPropietario(context.userId, nutricionistaId);

  const emailNormalizado = validateAndNormalizeEmail(payload.email);
  const { token: tokenInvitacion, expiresAt: fechaExpiracion } =
    generateInvitationToken(7);

  const resultado = await crearPacienteManual({
    nombre: payload.nombre.trim(),
    apellido: payload.apellido.trim(),
    email: emailNormalizado,
    tokenInvitacion,
    fechaExpiracion,
    nutricionistaId,
  });

  void enviarInvitacionRegistroPaciente({
    email: emailNormalizado,
    nombre: payload.nombre,
    tokenInvitacion,
    fechaExpiracion,
    pacienteId: resultado.pacienteId,
  });

  return {
    paciente: {
      pacienteId: resultado.pacienteId,
      usuarioId: resultado.usuarioId,
      nombre: payload.nombre.trim(),
      apellido: payload.apellido.trim(),
      email: emailNormalizado,
      estadoRegistro: "pendiente",
      estadoRegistroLabel: "No registrado",
      invitacionEnviada: true,
    },
    consultaTemporal: {
      consultaId: resultado.consultaTemporalId,
      pacienteId: resultado.pacienteId,
      nutricionistaId,
      estado: "borrador",
    },
  };
};
