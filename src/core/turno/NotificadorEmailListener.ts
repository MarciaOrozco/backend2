import type { EmailService } from "../../services/EmailService";
import { Turno } from "../../types/turno";
import { EventoTurno } from "../../types/turno";
import type { IListenerTurno } from "./IListenerTurno";
import { nombreCompleto } from "../../types/turno";

export class NotificadorEmailListener implements IListenerTurno {
  constructor(private readonly emailService: EmailService) {}

  update(turno: Turno, evento: EventoTurno): void {
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
