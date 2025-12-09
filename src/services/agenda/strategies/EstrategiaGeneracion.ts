/**
 * Define la forma de los registros obtenidos desde la tabla `disponibilidad`.
 */
export interface RangoDisponibilidad {
  dia_semana: string; // Ej: 'lunes'
  hora_inicio: string; // HH:MM:SS
  hora_fin: string; // HH:MM:SS
  intervalo_minutos?: number | null;
}

/**
 * Representa un turno existente que se debe excluir de la generación.
 */
export interface TurnoExistente {
  hora: string; // HH:MM:SS
}

/**
 * Resultado que se expone al frontend.
 */
export interface HorarioDisponible {
  hora: string; // HH:MM
  etiqueta: string; // Ej: '09:30 hs'
  dia_semana: string;
}

/**
 * Interfaz base del patrón Strategy para generar horarios disponibles.
 */
export interface EstrategiaGeneracion {
  /**
   * Recibe la disponibilidad del profesional y devuelve una lista de horarios
   * formateados para mostrarse al usuario.
   */
  generarHorarios(
    disponibilidad: RangoDisponibilidad[],
    turnosOcupados?: TurnoExistente[],
  ): HorarioDisponible[];
}
