import { EstrategiaGeneracion } from "./strategies/EstrategiaGeneracion";
import { Estrategia20Min } from "./strategies/Estrategia20Min";
import { Estrategia30Min } from "./strategies/Estrategia30Min";
import { Estrategia60Min } from "./strategies/Estrategia60Min";

export function crearEstrategia(nombre?: string): EstrategiaGeneracion {
  switch ((nombre ?? "").toLowerCase()) {
    case "20":
    case "20min":
    case "20-min":
    case "cada20":
      return new Estrategia20Min();
    case "60":
    case "60min":
    case "60-min":
    case "cada60":
      return new Estrategia60Min();
    case "30":
    case "30min":
    case "30-min":
    case "cada30":
    default:
      return new Estrategia30Min();
  }
}
