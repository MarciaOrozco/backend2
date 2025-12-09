export interface RangoDisponibilidad {
  dia_semana: string;
  hora_inicio: string; // 'HH:MM:SS'
  hora_fin: string;
  intervalo_minutos?: number | null;
}

export interface TurnoExistente {
  hora: string; // 'HH:MM:SS'
}

export interface GetTurnosDisponiblesParams {
  nutricionistaId: number;
  fecha: string; // YYYY-MM-DD
  dayName: string; // lunes, martes, etc.
  estrategia?: string;
  intervalo?: string;
}

export interface HorarioDisponible {
  hora: string; // "09:00"
  etiqueta: string; // "09:00 hs"
  dia_semana: string; // "lunes"
}

export interface GetTurnosDisponiblesResult {
  nutricionistaId: number;
  fecha: string;
  slots: HorarioDisponible[];
  message?: string;
}
