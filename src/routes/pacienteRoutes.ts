// import { Router } from "express";
// import { crearVinculacion } from "../controllers/vinculacionController";
// import {
//   obtenerPerfilPaciente,
//   obtenerDocumentosPaciente,
//   obtenerPlanesPaciente,
// } from "../controllers/pacienteController";
// import { getTurnosPaciente } from "../controllers/turnoController";
// import {
//   listarConsultasPaciente,
//   obtenerEvolucionPaciente,
// } from "../controllers/consultaController";
// import { authorizeRole } from "../middleware/authMiddleware";

// const router = Router();

// router.post("/vinculaciones", crearVinculacion);
// router.get("/:pacienteId/perfil", obtenerPerfilPaciente);
// router.get("/:pacienteId/turnos", getTurnosPaciente);
// router.get("/:pacienteId/documentos", obtenerDocumentosPaciente);
// router.get("/:pacienteId/planes", obtenerPlanesPaciente);
// router.get(
//   "/:pacienteId/consultas",
//   authorizeRole("nutricionista", "admin", "paciente"),
//   listarConsultasPaciente,
// );
// router.get("/:pacienteId/evolucion", obtenerEvolucionPaciente);

// export default router;
