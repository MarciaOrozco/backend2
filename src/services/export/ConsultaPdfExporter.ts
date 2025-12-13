import { ConsultaExportPayload } from "../../interfaces/consulta";
import { toISODateString } from "../../utils/dateUtils";
import { BasePdfExporter } from "./BasePdfExporter";

export class ConsultaPdfExporter extends BasePdfExporter<ConsultaExportPayload> {
  protected buildFileName(): string {
    return `consulta-${this.timestamp()}.pdf`;
  }

  protected render(
    doc: PDFKit.PDFDocument,
    payload: ConsultaExportPayload
  ): void {
    const { consulta, documentos, historialPeso, secciones } = payload;
    const incluir = (section: string) =>
      !secciones?.length || secciones.includes(section);

    doc
      .fontSize(18)
      .text(`Consulta #${consulta.consulta_id}`, { underline: true });
    doc.moveDown();

    if (incluir("informacion")) {
      doc.fontSize(14).text("Información", { underline: true });
      doc
        .fontSize(12)
        .text(`Fecha: ${toISODateString(consulta.fecha_consulta)}`);
      doc.fontSize(12).text(`Estado: ${consulta.estado}`);
      doc.moveDown();
    }

    if (incluir("motivo")) {
      doc.fontSize(14).text("Motivo", { underline: true });
      doc.fontSize(12).text(consulta.motivo ?? "-");
      doc.fontSize(12).text(`Antecedentes: ${consulta.antecedentes ?? "-"}`);
      doc.fontSize(12).text(`Objetivos: ${consulta.objetivos ?? "-"}`);
      doc.moveDown();
    }

    if (incluir("medidas")) {
      doc.fontSize(14).text("Medidas", { underline: true });
      doc.fontSize(12).text(`Peso: ${consulta.peso ?? "-"}`);
      doc.fontSize(12).text(`Altura: ${consulta.altura ?? "-"}`);
      doc.fontSize(12).text(`IMC: ${consulta.imc ?? "-"}`);
      doc.moveDown();
    }

    if (incluir("notas")) {
      doc.fontSize(14).text("Notas", { underline: true });
      doc.fontSize(12).text(`Resumen: ${consulta.resumen ?? "-"}`);
      doc.fontSize(12).text(`Diagnóstico: ${consulta.diagnostico ?? "-"}`);
      doc.fontSize(12).text(`Indicaciones: ${consulta.indicaciones ?? "-"}`);
      doc.moveDown();
    }

    if (incluir("documentos")) {
      doc.fontSize(14).text("Documentos", { underline: true });
      if (!documentos.length) {
        doc.fontSize(12).text("- Sin documentos asociados");
      } else {
        documentos.forEach((docRow) => {
          doc
            .fontSize(12)
            .text(
              `• ${
                docRow.descripcion ?? docRow.ruta_archivo
              } (${toISODateString(docRow.fecha)})`
            );
        });
      }
      doc.moveDown();
    }

    if (incluir("evolucion")) {
      doc.fontSize(14).text("Evolución", { underline: true });
      if (!historialPeso.length) {
        doc.fontSize(12).text("- Sin registros de peso");
      } else {
        historialPeso.forEach((row) => {
          doc
            .fontSize(12)
            .text(`${toISODateString(row.fecha)} · Peso: ${row.peso ?? "-"}`);
        });
      }
      doc.moveDown();
    }
  }

  private timestamp() {
    return Date.now();
  }
}
