export interface CreateTurnoPayload {
  fecha: string;
  hora: string;
  pacienteId: number;
  nutricionistaId: number;
  modalidadId?: number | null;
  metodoPagoId?: number | null;
}

export interface CreateTurnoResult {
  turnoId: number;
}
