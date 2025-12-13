import type { PoolConnection } from "mysql2/promise";
import type { RegisterPacienteTemplateData } from "../../interfaces/registerPacienteTemplateData";
import { RegistroPacienteTemplate } from "./RegistroPacienteTemplate";
import { DomainError } from "../../interfaces/errors";
import { createPacienteForUsuario } from "../../repositories/pacienteRepository";
import { createUsuario } from "../../repositories/usuarioRepository";

/**
 * Implementación del Template Method para el caso:
 * registro de paciente creando un usuario nuevo.
 */
export class RegistroPacienteNuevo extends RegistroPacienteTemplate {
  private nombreFinal: string;
  private apellidoFinal: string;
  private usuarioId!: number;

  constructor(
    connection: PoolConnection,
    data: RegisterPacienteTemplateData,
    rolPacienteId: number,
    estadoActivoId: number
  ) {
    super(connection, data, rolPacienteId, estadoActivoId);

    if (!data.nombre || !data.apellido) {
      throw new DomainError("Nombre y apellido son obligatorios", 400);
    }

    this.nombreFinal = data.nombre;
    this.apellidoFinal = data.apellido;
  }

  protected async procesarUsuario(): Promise<number> {
    this.usuarioId = await createUsuario(this.connection, {
      nombre: this.nombreFinal,
      apellido: this.apellidoFinal,
      email: this.data.email,
      password: this.data.hashedPassword,
      telefono: this.data.telefono,
      rolId: this.rolPacienteId,
    });

    return this.usuarioId;
  }

  protected async procesarPaciente(usuarioId: number): Promise<void> {
    await createPacienteForUsuario(
      this.connection,
      usuarioId,
      this.estadoActivoId
    );
  }

  protected obtenerNombreApellidoFinal() {
    return {
      nombre: this.nombreFinal,
      apellido: this.apellidoFinal,
    };
  }
}
