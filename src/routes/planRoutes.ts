import { Router } from "express";
import {
  actualizarPlan,
  crearPlanIA,
  crearPlanManual,
  exportarPlan,
  obtenerPlan,
  eliminarPlan,
  validarPlan,
} from "../controllers/planController";

const router = Router();

router.post("/ia", crearPlanIA);
router.post("/manual", crearPlanManual);
router.get("/:planId", obtenerPlan);
router.put("/:planId", actualizarPlan);
router.post("/:planId/validar", validarPlan);
router.post("/:planId/exportar", exportarPlan);
router.delete("/:planId", eliminarPlan);

export default router;
