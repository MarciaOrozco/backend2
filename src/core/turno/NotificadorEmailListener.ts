import type { EmailService } from "../../services/EmailService";
import { Turno } from "../../interfaces/turno";
import { EventoTurno } from "../../interfaces/turno";
import type { IListenerTurno } from "./IListenerTurno";
import { TurnoNotificacionTemplate } from "./TurnoNotificacionTemplate";

export class NotificadorEmailListener implements IListenerTurno {
  constructor(private readonly emailService: EmailService) {}

  update(turno: Turno, evento: EventoTurno): void {
    const { subject, body } = TurnoNotificacionTemplate.build(turno, evento);

    const destinatarios = [
      turno.paciente.email,
      turno.nutricionista.email ?? "",
    ].filter(Boolean);

    void Promise.all(
      destinatarios.map((to) =>
        this.emailService.sendEmail({ to, subject, body }).catch((error) => {
          console.error("No se pudo enviar email de turno", {
            error,
            evento,
            turnoId: turno.id,
            destinatario: to,
          });
        })
      )
    );
  }
}
