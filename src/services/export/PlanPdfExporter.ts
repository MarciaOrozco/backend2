import { BasePdfExporter } from "./BasePdfExporter";

export interface PlanExportPayload {
  plan: any;
}

const formatDate = (value: string | undefined | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
};

export class PlanPdfExporter extends BasePdfExporter<PlanExportPayload> {
  protected buildFileName(): string {
    return `plan-${this.timestamp()}.pdf`;
  }

  protected render(doc: PDFKit.PDFDocument, payload: PlanExportPayload): void {
    const { plan } = payload;

    doc.fontSize(20).text(`Plan alimentario #${plan.planId}`, {
      align: "center",
    });
    doc.moveDown();

    doc
      .fontSize(12)
      .text(
        `Estado: ${plan.status?.toUpperCase?.() ?? "-"} | Origen: ${
          plan.origin?.toUpperCase?.() ?? "MANUAL"
        }`
      );
    doc.text(`Fecha de creacion: ${formatDate(plan.createdAt)}`);
    doc.text(`Ultima actualizacion: ${formatDate(plan.updatedAt)}`);
    doc.moveDown();

    this.renderPaciente(doc, plan);
    this.renderNutricionista(doc, plan);
    this.renderPatientInfo(doc, plan);
    this.renderObjectives(doc, plan);
    this.renderConditions(doc, plan);
    this.renderRestrictions(doc, plan);
    this.renderNotes(doc, plan);
    this.renderWeek(doc, plan);
  }

  private renderPaciente(doc: PDFKit.PDFDocument, plan: any) {
    doc.fontSize(14).text("Paciente", { underline: true });
    doc.fontSize(12).text(`ID Paciente: ${plan.patientId}`);
    doc.moveDown(0.5);
  }

  private renderNutricionista(doc: PDFKit.PDFDocument, plan: any) {
    doc.fontSize(14).text("Nutricionista", { underline: true });
    doc.fontSize(12).text(`ID Nutricionista: ${plan.nutritionistId}`);
    doc.moveDown();
  }

  private renderPatientInfo(doc: PDFKit.PDFDocument, plan: any) {
    if (!plan.patientInfo) return;
    const info = plan.patientInfo;
    doc.fontSize(14).text("Datos del paciente", { underline: true });
    if (info.age) doc.text(`Edad: ${info.age}`);
    if (info.sex) doc.text(`Sexo: ${info.sex}`);
    if (info.weight) doc.text(`Peso: ${info.weight} kg`);
    if (info.height) doc.text(`Altura: ${info.height} cm`);
    if (info.activityLevel)
      doc.text(`Nivel de actividad: ${info.activityLevel}`);
    doc.moveDown();
  }

  private renderObjectives(doc: PDFKit.PDFDocument, plan: any) {
    if (!plan.objectives) return;
    const objectives = plan.objectives;
    doc.fontSize(14).text("Objetivos", { underline: true });
    if (objectives.primary) doc.text(`Principal: ${objectives.primary}`);
    if (objectives.secondary) doc.text(`Secundario: ${objectives.secondary}`);
    if (objectives.targetWeight)
      doc.text(`Peso objetivo: ${objectives.targetWeight} kg`);
    if (objectives.timeframe)
      doc.text(`Tiempo estimado: ${objectives.timeframe}`);
    doc.moveDown();
  }

  private renderConditions(doc: PDFKit.PDFDocument, plan: any) {
    if (
      !plan.medicalConditions?.conditions?.length &&
      !plan.medicalConditions?.notes
    )
      return;
    doc.fontSize(14).text("Condiciones medicas", { underline: true });
    if (plan.medicalConditions?.conditions?.length) {
      doc.text(`Lista: ${plan.medicalConditions.conditions.join(", ")}`);
    }
    if (plan.medicalConditions?.notes) {
      doc.text(`Notas: ${plan.medicalConditions.notes}`);
    }
    doc.moveDown();
  }

  private renderRestrictions(doc: PDFKit.PDFDocument, plan: any) {
    if (
      !plan.restrictions?.allergies?.length &&
      !plan.restrictions?.dislikes?.length &&
      !plan.restrictions?.dietType &&
      !plan.restrictions?.other
    ) {
      return;
    }

    doc.fontSize(14).text("Restricciones y preferencias", { underline: true });
    if (plan.restrictions?.dietType) {
      doc.text(`Tipo de dieta: ${plan.restrictions.dietType}`);
    }
    if (plan.restrictions?.allergies?.length) {
      doc.text(`Alergias: ${plan.restrictions.allergies.join(", ")}`);
    }
    if (plan.restrictions?.dislikes?.length) {
      doc.text(`No le agradan: ${plan.restrictions.dislikes.join(", ")}`);
    }
    if (plan.restrictions?.other) {
      doc.text(`Otras indicaciones: ${plan.restrictions.other}`);
    }
    doc.moveDown();
  }

  private renderNotes(doc: PDFKit.PDFDocument, plan: any) {
    if (!plan.notes) return;
    doc.fontSize(14).text("Notas generales", { underline: true });
    doc.fontSize(12).text(plan.notes);
    doc.moveDown();
  }

  private renderWeek(doc: PDFKit.PDFDocument, plan: any) {
    doc.fontSize(16).text("Plan semanal", { underline: true });
    doc.moveDown();

    (plan.days ?? []).forEach((day: any) => {
      doc.fontSize(14).text(day.name ?? `Dia ${day.dayNumber}`, {
        underline: true,
      });
      if (day.goal) {
        doc.fontSize(12).text(`Objetivo del dia: ${day.goal}`);
      }
      if (day.totals) {
        const totalsEntries = Object.entries(day.totals).filter(
          ([_, value]) => value !== undefined && value !== null
        );
        if (totalsEntries.length) {
          doc
            .fontSize(12)
            .text(
              `Totales: ${totalsEntries
                .map(([key, value]) => `${key}: ${value}`)
                .join(" | ")}`
            );
        }
      }
      doc.moveDown(0.5);

      if (!day.meals.length) {
        doc.fontSize(12).text("- Sin comidas registradas");
        doc.moveDown();
      } else {
        day.meals.forEach((meal: any) => {
          doc.fontSize(12).text(`• ${meal.type}`);
          if (meal.title) doc.text(`  Titulo: ${meal.title}`);
          if (meal.time) doc.text(`  Hora: ${meal.time}`);
          if (meal.description) doc.text(`  Detalle: ${meal.description}`);

          const nutrients = [
            meal.calories ? `Calorias: ${meal.calories}` : null,
            meal.proteins ? `Proteinas: ${meal.proteins}` : null,
            meal.carbs ? `Carbohidratos: ${meal.carbs}` : null,
            meal.fats ? `Grasas: ${meal.fats}` : null,
            meal.fiber ? `Fibra: ${meal.fiber}` : null,
          ].filter(Boolean);
          if (nutrients.length) {
            doc.text(`  Nutrientes: ${nutrients.join(" | ")}`);
          }

          if (meal.foods?.length) {
            doc.text(
              `  Alimentos: ${meal.foods
                .map((food: any) =>
                  food.quantity
                    ? `${food.name} (${food.quantity}${
                        food.unit ? ` ${food.unit}` : ""
                      })`
                    : food.name
                )
                .join(", ")}`
            );
          }

          if (meal.notes) {
            doc.text(`  Observaciones: ${meal.notes}`);
          }

          doc.moveDown(0.5);
        });
      }

      if (day.notes) {
        doc.text(`Notas del dia: ${day.notes}`);
      }

      doc.moveDown();
    });
  }

  private timestamp() {
    return Date.now();
  }
}
