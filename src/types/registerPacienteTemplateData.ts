/**
 * Datos normalizados que usan las clases del Template Method
 * para el registro de paciente.
 */
export interface RegisterPacienteTemplateData {
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  token: string | null;
  hashedPassword: string;
}
