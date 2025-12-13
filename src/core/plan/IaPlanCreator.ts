import type { Request } from "express";
import {
  PlanCreatorTemplate,
  type PlanCreatorDeps,
} from "./PlanCreatorTemplate";
import { PlanDay, PlanMetadata } from "../../interfaces/plan";

interface IaPlanCreatorExtraDeps {
  generarPlanIA: (params: Record<string, unknown>) => Promise<any>;
  mapIaResponseToDays: (response: any) => PlanDay[];
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export class IaPlanCreator extends PlanCreatorTemplate {
  private readonly logger: Pick<Console, "log" | "warn" | "error">;

  constructor(
    deps: PlanCreatorDeps,
    private readonly iaDeps: IaPlanCreatorExtraDeps
  ) {
    super(deps);
    this.logger = iaDeps.logger ?? console;
  }

  protected async obtenerDias(
    _req: Request,
    metadata: PlanMetadata
  ): Promise<PlanDay[] | undefined> {
    const parametrosIA = {
      edad: metadata.patientInfo?.age,
      sexo: metadata.patientInfo?.sex,
      peso: metadata.patientInfo?.weight,
      altura: metadata.patientInfo?.height,
      objetivo:
        metadata.objectives?.primary ?? metadata.objectives?.secondary ?? null,
      actividad: metadata.patientInfo?.activityLevel,
      medicalConditions: metadata.medicalConditions,
      restrictions: metadata.restrictions,
      preferences: metadata.preferences,
    };

    try {
      this.logger.log(
        "[IaPlanCreator] Llamando a generarPlanIA con:",
        parametrosIA
      );
      const iaResponse = await this.iaDeps.generarPlanIA(parametrosIA);
      this.logger.log(
        "[IaPlanCreator] Respuesta de IA recibida:",
        JSON.stringify(iaResponse, null, 2)
      );

      const mapped = this.iaDeps.mapIaResponseToDays(iaResponse);
      if (mapped.length) {
        this.logger.log(
          "[IaPlanCreator] ✅ Días generados por IA:",
          mapped.length
        );
        return mapped;
      }

      this.logger.warn(
        "[IaPlanCreator] ⚠️ La respuesta de IA no contiene días válidos. Se utilizará fallback sin días."
      );
    } catch (error) {
      this.logger.error(
        "[IaPlanCreator] ❌ Error al generar plan con IA. Se usará fallback local.",
        error
      );
    }

    return undefined;
  }
}
