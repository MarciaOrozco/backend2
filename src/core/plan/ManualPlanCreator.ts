import type { Request } from "express";
import {
  PlanCreatorTemplate,
  type PlanCreatorDeps,
} from "./PlanCreatorTemplate";
import { PlanDay, PlanMetadata } from "../../interfaces/plan";

export class ManualPlanCreator extends PlanCreatorTemplate {
  constructor(deps: PlanCreatorDeps) {
    super(deps);
  }

  protected async obtenerDias(
    req: Request,
    _metadata: PlanMetadata
  ): Promise<PlanDay[] | undefined> {
    const daysInput = req.body?.days;
    if (!Array.isArray(daysInput) || !daysInput.length) {
      return undefined;
    }
    return daysInput as PlanDay[];
  }
}
