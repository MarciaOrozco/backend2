import { EstrategiaGeneracion } from "./strategies/EstrategiaGeneracion";
import { Estrategia20Min } from "./strategies/Estrategia20Min";
import { Estrategia30Min } from "./strategies/Estrategia30Min";
import { Estrategia60Min } from "./strategies/Estrategia60Min";

const normalizar = (valor?: string | number | null) => {
  if (valor == null) return "";
  if (typeof valor === "number") return String(valor);
  return valor.toString().trim().toLowerCase();
};

export function crearEstrategia(
  nombre?: string | number | null
): EstrategiaGeneracion {
  switch (normalizar(nombre)) {
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
