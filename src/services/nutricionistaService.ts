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
import {
  existsRelacionPacienteProfesional,
  insertRelacionPacienteProfesional,
  assertVinculoActivo,
} from "../repositories/vinculoRepository";
import { findUsuarioByEmail } from "../repositories/usuarioRepository";
import { findRolIdByNombre } from "../repositories/rolRepository";
import { getPacienteContactoById } from "../repositories/pacienteRepository";
import { findEstadoRegistroIdByNombre } from "../repositories/estadoRegistroRepository";
import { insertConsulta } from "../repositories/consultaRepository";
import { pool } from "../config/db";
import { createEmailService } from "./EmailService";
import crypto from "crypto";

const emailService = createEmailService();
const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL ??
  process.env.APP_BASE_URL ??
  "http://localhost:5173";

const buildRegistroLink = (email: string, token: string) => {
  const params = new URLSearchParams({
    email,
    token,
  });
  return `${FRONTEND_BASE_URL.replace(/\/$/, "")}/register?${params.toString()}`;
};

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
    especialidades: row.especialidades
      ? String(row.especialidades)
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean)
      : [],
    modalidades: row.modalidades
      ? String(row.modalidades)
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean)
      : [],
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
  context: { userId: number; userRol: string; userNutricionistaId?: number | null }
) => {
  if (context.userRol === "nutricionista") {
    await ensureNutricionistaPropietario(
      context.userId,
      context.userNutricionistaId ?? nutricionistaId
    );
  }

  const rows = await findPacientesVinculados(undefined, nutricionistaId);

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
  context: { userId: number; userRol: string; userNutricionistaId?: number | null }
) => {
  if (context.userRol === "nutricionista") {
    await ensureNutricionistaPropietario(
      context.userId,
      context.userNutricionistaId ?? nutricionistaId
    );
  } else if (context.userRol !== "admin") {
    throw new DomainError("No autorizado", 403);
  }

  const rows = await findTurnosActivosByNutricionista(
    undefined,
    nutricionistaId
  );

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
  context: { userId: number; userRol: string; userNutricionistaId?: number | null }
) => {
  if (context.userRol === "nutricionista") {
    await ensureNutricionistaPropietario(
      context.userId,
      context.userNutricionistaId ?? nutricionistaId
    );
  } else if (context.userRol !== "admin") {
    throw new DomainError("No autorizado", 403);
  }

  await assertVinculoActivo(pacienteId, nutricionistaId);

  const contacto = await getPacienteContactoById(pool, pacienteId);
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

interface AgregarPacienteManualContext {
  userId: number;
  userRol: string;
  userNutricionistaId?: number | null;
}

export const agregarPacienteManual = async (
  nutricionistaId: number,
  payload: { nombre: string; apellido: string; email: string },
  context: AgregarPacienteManualContext
) => {
  if (context.userRol !== "nutricionista") {
    throw new DomainError("No autorizado", 403);
  }

  const asociado = await ensureNutricionistaPropietario(
    context.userId,
    context.userNutricionistaId ?? nutricionistaId
  );

  if (Number(asociado) !== Number(nutricionistaId)) {
    throw new DomainError("No autorizado para esta operación", 403);
  }

  const emailNormalizado = String(payload.email).trim().toLowerCase();
  const emailRegex =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

  if (!emailRegex.test(emailNormalizado)) {
    throw new DomainError("Email inválido", 400);
  }

  const tokenInvitacion = crypto.randomBytes(24).toString("hex");
  const fechaExpiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const rolPacienteId =
      (await findRolIdByNombre(connection, "paciente")) ??
      (() => {
        throw new DomainError("Rol paciente no configurado", 500);
      })();

    const estadoPendienteId =
      (await findEstadoRegistroIdByNombre(connection, "pendiente")) ??
      (() => {
        throw new DomainError(
          "Estado de registro 'pendiente' no configurado",
          500
        );
      })();

    const usuarioExistente = await findUsuarioByEmail(
      connection,
      emailNormalizado
    );

    let usuarioId: number;

    if (usuarioExistente) {
      usuarioId = Number(usuarioExistente.usuario_id);

      // Si no es paciente, actualiza el rol
      if (
        usuarioExistente.rol_id == null ||
        Number(usuarioExistente.rol_id) !== rolPacienteId
      ) {
        await connection.query(
          `UPDATE usuario SET rol_id = ? WHERE usuario_id = ?`,
          [rolPacienteId, usuarioId]
        );
      }

      await connection.query(
        `UPDATE usuario SET nombre = ?, apellido = ? WHERE usuario_id = ?`,
        [payload.nombre.trim(), payload.apellido.trim(), usuarioId]
      );
    } else {
      const [result]: any = await connection.query(
        `
          INSERT INTO usuario (nombre, apellido, email, password, telefono, fecha_registro, rol_id)
          VALUES (?, ?, ?, ?, NULL, NOW(), ?)
        `,
        [payload.nombre.trim(), payload.apellido.trim(), emailNormalizado, "", rolPacienteId]
      );
      usuarioId = Number(result.insertId);
    }

    // Busca paciente vinculado al usuario
    const [pacRows]: any = await connection.query(
      `
        SELECT p.paciente_id, er.nombre AS estado_registro
        FROM paciente p
        LEFT JOIN estado_registro er ON p.estado_registro_id = er.estado_registro_id
        WHERE p.usuario_id = ?
        LIMIT 1
      `,
      [usuarioId]
    );

    let pacienteId: number;

    if (pacRows.length) {
      const estadoActual = pacRows[0].estado_registro
        ? String(pacRows[0].estado_registro).toLowerCase()
        : null;

      if (estadoActual && estadoActual !== "pendiente") {
        throw new DomainError("Paciente ya registrado", 409);
      }

      pacienteId = Number(pacRows[0].paciente_id);

      await connection.query(
        `
          UPDATE paciente
          SET
            estado_registro_id = ?,
            fecha_invitacion = NOW(),
            fecha_expiracion = ?,
            token_invitacion = ?,
            usuario_id = ?
          WHERE paciente_id = ?
        `,
        [estadoPendienteId, fechaExpiracion, tokenInvitacion, usuarioId, pacienteId]
      );
    } else {
      const [pacienteResult]: any = await connection.query(
        `
          INSERT INTO paciente (
            usuario_id,
            estado_registro_id,
            fecha_invitacion,
            fecha_expiracion,
            token_invitacion
          )
          VALUES (?, ?, NOW(), ?, ?)
        `,
        [usuarioId, estadoPendienteId, fechaExpiracion, tokenInvitacion]
      );

      pacienteId = Number(pacienteResult.insertId);
    }

    // Relación paciente-profesional
    const existeRelacion = await existsRelacionPacienteProfesional(
      connection,
      pacienteId,
      nutricionistaId
    );

    if (!existeRelacion) {
      await insertRelacionPacienteProfesional(
        connection,
        pacienteId,
        nutricionistaId
      );
    }

    // Crear consulta temporal en borrador
    const consultaTemporalId = await insertConsulta(
      connection,
      pacienteId,
      nutricionistaId
    );

    await connection.commit();

    const registroLink = buildRegistroLink(emailNormalizado, tokenInvitacion);

    void emailService
      .sendEmail({
        to: emailNormalizado,
        subject: "Te invitaron a registrarte en Nutrito",
        body: `Hola ${payload.nombre},\n\n${"Tu nutricionista te invitó a registrarte para ver tus planes y turnos."}\n\nCompletá tu registro aquí: ${registroLink}\n\nEste enlace expira el ${fechaExpiracion.toLocaleDateString()}.`,
      })
      .catch((error) => {
        console.error("No se pudo enviar invitación de registro al paciente", {
          error,
          email: emailNormalizado,
          pacienteId,
        });
      });

    return {
      paciente: {
        pacienteId,
        usuarioId,
        nombre: payload.nombre.trim(),
        apellido: payload.apellido.trim(),
        email: emailNormalizado,
        estadoRegistro: "pendiente",
        estadoRegistroLabel: "No registrado",
        invitacionEnviada: true,
        registroLink,
      },
      consultaTemporal: {
        consultaId: consultaTemporalId,
        pacienteId,
        nutricionistaId,
        estado: "borrador",
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
