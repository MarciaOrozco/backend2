import type { PoolConnection } from "mysql2/promise";
import type { RegisterPacienteTemplateData } from "../../interfaces/registerPacienteTemplateData";
import { RegistroPacienteTemplate } from "./RegistroPacienteTemplate";
import { DomainError } from "../../interfaces/errors";
import {
  updateUsuarioDatos,
  updateUsuarioRol,
  UsuarioAuthRow,
} from "../../repositories/usuarioRepository";
import {
  activatePaciente,
  createPacienteForUsuario,
  findPacientePendiente,
  linkPacienteToUsuario,
} from "../../repositories/pacienteRepository";

/**
 * Implementación del Template Method para el caso:
 * registro de paciente a partir de un usuario ya existente.
 */
export class RegistroPacienteExistente extends RegistroPacienteTemplate {
  private usuario: UsuarioAuthRow;
  private nombreFinal: string | null;
  private apellidoFinal: string | null;

  constructor(
    connection: PoolConnection,
    data: RegisterPacienteTemplateData,
    rolPacienteId: number,
    estadoActivoId: number,
    usuario: UsuarioAuthRow
  ) {
    super(connection, data, rolPacienteId, estadoActivoId);
    this.usuario = usuario;

    // valores iniciales, se completan con lo que venga o con lo que ya tenía el usuario
    this.nombreFinal = data.nombre ?? usuario.nombre ?? null;
    this.apellidoFinal = data.apellido ?? usuario.apellido ?? null;
  }

  protected async procesarUsuario(): Promise<number> {
    const usuarioId = Number(this.usuario.usuario_id);

    // Si el usuario no tiene rol paciente, lo actualizamos
    if (this.usuario.rol_id !== this.rolPacienteId) {
      await updateUsuarioRol(this.connection, usuarioId, this.rolPacienteId);
    }

    // Actualizamos datos básicos del usuario (nombre, apellido, password, teléfono)
    await updateUsuarioDatos(this.connection, {
      usuarioId,
      nombre: this.nombreFinal,
      apellido: this.apellidoFinal,
      password: this.data.hashedPassword,
      telefono: this.data.telefono,
    });

    return usuarioId;
  }

  protected async procesarPaciente(usuarioId: number): Promise<void> {
    const paciente = await findPacientePendiente(
      this.connection,
      usuarioId,
      this.data.token
    );

    if (paciente) {
      const estadoActual = paciente.estado_registro
        ? String(paciente.estado_registro).toLowerCase()
        : null;

      if (estadoActual !== "pendiente") {
        throw new DomainError("Paciente ya registrado con ese email", 409);
      }

      if (
        !this.data.token ||
        !paciente.token_invitacion ||
        this.data.token !== paciente.token_invitacion
      ) {
        throw new DomainError("Token de invitación inválido", 400);
      }

      const expiracionRaw = paciente.fecha_expiracion;
      if (expiracionRaw) {
        const exp = new Date(expiracionRaw);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          throw new DomainError("La invitación ha expirado", 400);
        }
      }

      if (!paciente.usuario_id) {
        await linkPacienteToUsuario(
          this.connection,
          paciente.paciente_id,
          usuarioId
        );
      }

      await activatePaciente(
        this.connection,
        paciente.paciente_id,
        this.estadoActivoId
      );
    } else {
      // No hay invitación pendiente, creamos un paciente nuevo para ese usuario
      await createPacienteForUsuario(
        this.connection,
        usuarioId,
        this.estadoActivoId
      );
    }
  }

  protected obtenerNombreApellidoFinal() {
    return {
      nombre: this.nombreFinal,
      apellido: this.apellidoFinal,
    };
  }
}
