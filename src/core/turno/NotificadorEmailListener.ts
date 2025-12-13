import type { EmailService } from "../../services/EmailService";
import { Turno } from "../../interfaces/turno";
import { EventoTurno } from "../../interfaces/turno";
import type {
  EventoTurnoPayload,
  TurnoParticipante,
} from "../../interfaces/turno";
import type { IListenerTurno } from "./IListenerTurno";

export const nombreCompleto = (p: TurnoParticipante): string =>
  [p.nombre, p.apellido].filter(Boolean).join(" ").trim();

export class NotificadorEmailListener implements IListenerTurno {
  constructor(private readonly emailService: EmailService) {}

  // Ignora payload extra por ahora; mantiene contrato para otros listeners.
  update(
    turno: Turno,
    evento: EventoTurno,
    _payload?: EventoTurnoPayload
  ): void {
    const { subject, body } = this.buildMessage(turno, evento);

    const destinatarios = [
      turno.paciente.email,
      turno.nutricionista.email ?? "",
    ].filter(Boolean);

    const envios = destinatarios.map((to) =>
      this.emailService.sendEmail({ to, subject, body }).catch((error) => {
        console.error("No se pudo enviar email de turno", {
          error,
          evento,
          turnoId: turno.id,
          destinatario: to,
        });
      })
    );

    void Promise.all(envios);
  }

  private buildMessage(turno: Turno, evento: EventoTurno) {
    const fechaHora = `${turno.fecha} ${turno.hora}`;
    const nutriNombre = nombreCompleto(turno.nutricionista) || "el profesional";

    switch (evento) {
      case EventoTurno.CREADO:
        return {
          subject: "Turno creado",
          body: `Se creó el turno #${turno.id} para el ${fechaHora} con ${nutriNombre}.`,
        };

      case EventoTurno.CANCELADO:
        return {
          subject: "Turno cancelado",
          body: `El turno #${turno.id} programado para el ${fechaHora} fue cancelado.`,
        };

      case EventoTurno.REPROGRAMADO:
        return {
          subject: "Turno reprogramado",
          body: `El turno #${turno.id} fue reprogramado para el ${fechaHora} con ${nutriNombre}.`,
        };

      default:
        return {
          subject: "Actualización de turno",
          body: `El turno #${turno.id} tuvo una actualización (${evento}) para el ${fechaHora}.`,
        };
    }
  }
}
