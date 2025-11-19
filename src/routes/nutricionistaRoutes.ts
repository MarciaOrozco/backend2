import { Router } from "express";
import {
  getNutricionistas,
  //   getNutricionistaById,
  //   agregarPacienteManual,
  //   getPacientesVinculados,
  //   getTurnosNutricionista,
  //   getPacientePerfilParaNutricionista,
  //
} from "../controllers/nutricionistaController";
// import {
//   cancelarTurnoNutricionista,
//   reprogramarTurnoNutricionista,
// } from "../controllers/turnoController";
// import { authenticateJWT, authorizeRole } from "../middleware/authMiddleware";

const router = Router();

router.get("/", getNutricionistas);
// router.get("/:id", getNutricionistaById);
// router.post(
//   "/:nutricionistaId/pacientes/manual",
//   authenticateJWT,
//   authorizeRole("nutricionista"),
//   agregarPacienteManual,
// );
// router.get(
//   "/:nutricionistaId/pacientes",
//   authenticateJWT,
//   authorizeRole("nutricionista", "admin"),
//   getPacientesVinculados,
// );
// router.get(
//   "/:nutricionistaId/turnos",
//   authenticateJWT,
//   authorizeRole("nutricionista", "admin"),
//   getTurnosNutricionista,
// );
// router.patch(
//   "/:nutricionistaId/turnos/:turnoId/cancelar",
//   authenticateJWT,
//   authorizeRole("nutricionista", "admin"),
//   cancelarTurnoNutricionista,
// );
// router.put(
//   "/:nutricionistaId/turnos/:turnoId/reprogramar",
//   authenticateJWT,
//   authorizeRole("nutricionista", "admin"),
//   reprogramarTurnoNutricionista,
// );
// router.get(
//   "/:nutricionistaId/pacientes/:pacienteId",
//   authenticateJWT,
//   authorizeRole("nutricionista", "admin"),
//   getPacientePerfilParaNutricionista,
// );

export default router;
