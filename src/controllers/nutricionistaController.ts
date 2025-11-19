import type { Request, Response } from "express";
import { getNutricionistas as getNutricionistasService } from "../services/nutricionistaService";
import type { NutricionistaFilters } from "../types/nutricionista";

export const getNutricionistas = async (req: Request, res: Response) => {
  try {
    const { nombre, especialidad, especialidades, modalidades } = req.query;

    const filters: NutricionistaFilters = {
      nombre: typeof nombre === "string" ? nombre : undefined,
      especialidad: typeof especialidad === "string" ? especialidad : undefined,
      especialidades:
        typeof especialidades === "string"
          ? especialidades
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
      modalidades:
        typeof modalidades === "string"
          ? modalidades
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
          : undefined,
    };

    const data = await getNutricionistasService(filters);

    return res.json({ data });
  } catch (error) {
    console.error("Error al obtener nutricionistas:", error);
    return res.status(500).json({ error: "Error al obtener nutricionistas" });
  }
};
