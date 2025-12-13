export interface PacienteContacto {
  pacienteId: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  ciudad: string | null;
}

export interface DocumentoPaciente {
  id: number;
  descripcion: string | null;
  ruta: string;
  fecha: string | null;
}

export interface PlanPacienteResumen {
  id: number;
  fechaCreacion: string | null;
  ultimaActualizacion: string | null;
  fechaValidacion: string | null;
  estado: string | null;
  origen: string | null;
  titulo: string | null;
  notas: string | null;
}

export interface AgregarPacienteManualContext {
  userId: number;
  userRol: string;
  userNutricionistaId?: number | null;
}
