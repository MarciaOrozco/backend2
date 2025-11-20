import { Router } from "express";
import {
  cancelarTurno,
  createTurno,
  getTurnosDisponibles,
} from "../controllers/turnoController";

const router = Router();

router.get("/disponibles/:nutricionistaId", getTurnosDisponibles);
router.post("/", createTurno);
router.patch("/:id/cancelar", cancelarTurno);
// router.put("/:id/reprogramar", reprogramarTurno);
router.delete("/:id", cancelarTurno);

export default router;
