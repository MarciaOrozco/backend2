import type { PoolConnection } from "mysql2/promise";
import type { RegisterPacienteTemplateData } from "../../interfaces/registerPacienteTemplateData";

/**
 * Clase base del patrón Template Method para el registro de pacientes.
 *
 * Define el esqueleto del algoritmo (ejecutar) y delega
 * los pasos variables en métodos abstractos que implementan
 * las variantes "usuario existente" y "usuario nuevo".
 */
export abstract class RegistroPacienteTemplate {
  protected connection: PoolConnection;
  protected data: RegisterPacienteTemplateData;
  protected rolPacienteId: number;
  protected estadoActivoId: number;

  constructor(
    connection: PoolConnection,
    data: RegisterPacienteTemplateData,
    rolPacienteId: number,
    estadoActivoId: number
  ) {
    this.connection = connection;
    this.data = data;
    this.rolPacienteId = rolPacienteId;
    this.estadoActivoId = estadoActivoId;
  }

  /**
   * Template Method: define el flujo general del registro de paciente.
   * Las subclases implementan los pasos específicos.
   */
  async ejecutar(): Promise<{
    usuarioId: number;
    nombre: string | null;
    apellido: string | null;
  }> {
    const usuarioId = await this.procesarUsuario();
    await this.procesarPaciente(usuarioId);

    const { nombre, apellido } = this.obtenerNombreApellidoFinal();

    return {
      usuarioId,
      nombre,
      apellido,
    };
  }

  /**
   * Paso 1: crear o actualizar el usuario asociado al paciente.
   * Debe devolver el usuarioId.
   */
  protected abstract procesarUsuario(): Promise<number>;

  /**
   * Paso 2: crear o actualizar el registro de paciente asociado.
   */
  protected abstract procesarPaciente(usuarioId: number): Promise<void>;

  /**
   * Paso 3: obtener el nombre/apellido final a devolver.
   */
  protected abstract obtenerNombreApellidoFinal(): {
    nombre: string | null;
    apellido: string | null;
  };
}
