import type { Request } from "express";
import {
  type CreatePlanPayload,
  type PlanDay,
  type PlanMetadata,
  type PlanRecord,
} from "../../interfaces/plan";
import { assertVinculoActivo } from "../../repositories/vinculoRepository";

export class PlanCreationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type PlanPersistFn = (payload: CreatePlanPayload) => Promise<PlanRecord>;

export interface PlanCreatorDeps {
  ensureNutricionista: (req: Request) => number;
  normalizeMetadata: (input: any) => PlanMetadata;
  normalizeDays: (input: any) => PlanDay[];
  persistPlan: PlanPersistFn;
}

export abstract class PlanCreatorTemplate {
  constructor(protected readonly deps: PlanCreatorDeps) {}

  async crearPlan(req: Request): Promise<PlanRecord> {
    const pacienteId = this.obtenerPacienteId(req);
    const nutricionistaId = this.deps.ensureNutricionista(req);

    await assertVinculoActivo(pacienteId, nutricionistaId);

    const metadataRaw = this.obtenerMetadata(req);
    const metadata = this.deps.normalizeMetadata(metadataRaw);
    const { origin: _ignoredOrigin, ...metadataRest } = metadata;

    const payload: CreatePlanPayload = {
      patientId: pacienteId,
      nutritionistId: nutricionistaId,
      ...metadataRest,
    };

    const days = await this.obtenerDias(req, metadataRest);
    if (Array.isArray(days) && days.length) {
      const normalizedDays = this.deps.normalizeDays(days);
      if (normalizedDays.length) {
        payload.days = normalizedDays;
      }
    }

    return this.deps.persistPlan(payload);
  }

  protected obtenerPacienteId(req: Request): number {
    const pacienteId = Number.parseInt(req.body?.pacienteId, 10);
    if (Number.isNaN(pacienteId)) {
      throw new PlanCreationError(422, "pacienteId invalido");
    }
    return pacienteId;
  }

  protected obtenerMetadata(req: Request): any {
    return req.body?.metadata ?? {};
  }

  protected abstract obtenerDias(
    req: Request,
    metadata: PlanMetadata
  ): Promise<PlanDay[] | undefined>;
}
