export interface RegisterPacientePayload {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  telefono?: string;
  token?: string;
}

export interface LoginPayload {
  email?: string;
  password?: string;
}

export interface AuthUserView {
  usuarioId: number;
  rol: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUserView;
}

export interface SesionInfo {
  usuarioId: number;
  rol: string;
  nombre: string | null;
  apellido: string | null;
  email: string;
  telefono: string | null;
  pacienteId: number | null;
  nutricionistaId: number | null;
}
