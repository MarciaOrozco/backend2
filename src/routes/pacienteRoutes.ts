import { Router } from "express";
import { crearVinculacion } from "../controllers/vinculacionController";
import {
  obtenerDocumentosPaciente,
  obtenerPerfilPaciente,
  obtenerPlanesPaciente,
} from "../controllers/pacienteController";
import { getTurnosPaciente } from "../controllers/turnoController";
import { authorizeRole } from "../middlewares/authMiddleware";
import { listarConsultasPaciente } from "../controllers/consultaController";

const router = Router();

router.post("/vinculaciones", crearVinculacion);
router.get("/:pacienteId/perfil", obtenerPerfilPaciente);
router.get("/:pacienteId/turnos", getTurnosPaciente);
router.get("/:pacienteId/documentos", obtenerDocumentosPaciente);
router.get("/:pacienteId/planes", obtenerPlanesPaciente);
router.get(
  "/:pacienteId/consultas",
  authorizeRole("nutricionista", "admin", "paciente"),
  listarConsultasPaciente
);
// router.get("/:pacienteId/evolucion", obtenerEvolucionPaciente);

export default router;
